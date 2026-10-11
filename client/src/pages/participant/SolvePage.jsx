import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { olympiadsApi, submissionsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import { EmptyState, Modal, Skeleton, useToast } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { runAgainstInputs, runSampleTests } from '../../lib/pyodideRunner';
import {
  PYTHON_SNIPPETS,
  getPythonEditorOptions,
  insertSnippet,
  registerPythonLanguage,
} from '../../lib/monacoPython';
import {
  formatSolveDuration,
  penaltyStep,
  scoreSummary as calcScoreSummary,
} from '../../lib/scoring';
import { countdownParts, formatCountdown, roleLabel } from '../../utils/format';
import './solve.css';

const DEFAULT_CODE = `def solve():
    # напишите решение
    pass


if __name__ == "__main__":
    solve()
`;

function taskLetter(index) {
  return String.fromCharCode(65 + index);
}

export default function SolvePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const toast = useToast();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const [olympiad, setOlympiad] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [taskId, setTaskId] = useState(null);
  const [codeByTask, setCodeByTask] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [consoleTab, setConsoleTab] = useState('output');
  const [consoleState, setConsoleState] = useState({
    status: 'info',
    label: 'Готово к запуску',
    text: 'Нажмите «Запустить», чтобы проверить код на sample-тестах без отправки.',
  });
  const [savedAt, setSavedAt] = useState(null);
  const [parts, setParts] = useState(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  // Тёмная тема для экрана решения
  useEffect(() => {
    const prev = localStorage.getItem('olymp_theme') || 'light';
    setTheme('dark');
    return () => setTheme(prev);
  }, [setTheme]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [oData, sData] = await Promise.all([
        olympiadsApi.get(id),
        submissionsApi.mine(id),
      ]);
      setOlympiad(oData.olympiad);
      setRegistration(oData.registration || null);
      setSubmissions(sData.submissions || []);
      const first = oData.olympiad.tasks?.[0];
      setTaskId((prev) => prev || first?.id || null);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!olympiad?.endsAt) return undefined;
    const tick = () => setParts(countdownParts(olympiad.endsAt));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [olympiad]);

  const task = useMemo(
    () => (olympiad?.tasks || []).find((t) => t.id === taskId) || null,
    [olympiad, taskId]
  );

  const code = codeByTask[taskId] ?? DEFAULT_CODE;

  function setCode(next) {
    setCodeByTask((prev) => ({ ...prev, [taskId]: next }));
    setSavedAt(new Date());
  }

  // Автосохранение в localStorage
  useEffect(() => {
    if (!taskId) return undefined;
    const key = `olimp_code_${id}_${taskId}`;
    const existing = localStorage.getItem(key);
    if (existing && codeByTask[taskId] === undefined) {
      setCodeByTask((prev) => ({ ...prev, [taskId]: existing }));
    }
    const t = window.setInterval(() => {
      const current = codeByTask[taskId] ?? DEFAULT_CODE;
      localStorage.setItem(key, current);
      setSavedAt(new Date());
    }, 5000);
    return () => window.clearInterval(t);
  }, [id, taskId, codeByTask]);

  const scoreSummary = useMemo(() => {
    return calcScoreSummary(
      submissions,
      olympiad?.tasks || [],
      olympiad?.penaltyPercent ?? 5,
      olympiad?.startsAt || olympiad?.createdAt
    );
  }, [olympiad, submissions]);

  const bestByTask = scoreSummary.byTask || {};

  const taskPenalty = task
    ? penaltyStep(task.points, olympiad?.penaltyPercent ?? 5)
    : 0;

  async function onRun() {
    if (!task) return;
    setRunning(true);
    setConsoleTab('output');
    setConsoleState({
      status: 'info',
      label: 'Запуск…',
      text: 'Загружается Python runtime (Pyodide) и выполняются sample-тесты…',
    });
    try {
      await submissionsApi.run({ taskId: task.id, code });
      const result = await runSampleTests(code, task.testCases || []);
      setConsoleState({
        status: result.ok ? 'ok' : 'fail',
        label: result.status,
        text: result.output,
      });
      toast[result.ok ? 'success' : 'error'](
        result.ok ? 'Sample-тесты пройдены' : 'Есть ошибки на тестах'
      );
    } catch (err) {
      setConsoleState({
        status: 'fail',
        label: 'ERROR',
        text: err.message || String(err),
      });
      toast.error(err.message || 'Ошибка запуска');
    } finally {
      setRunning(false);
    }
  }

  async function onConfirmFinish() {
    setFinishing(true);
    try {
      const data = await olympiadsApi.complete(id);
      setRegistration(data.registration);
      setConfirmOpen(false);
      toast.success('Участие завершено. Ожидайте результатов.');
    } catch (err) {
      toast.error(err.message || 'Не удалось завершить участие');
    } finally {
      setFinishing(false);
    }
  }

  async function onSubmit() {
    if (!task) return;
    const cases = task.testCases || [];
    if (!cases.length) {
      toast.error('У задания нет автотестов');
      return;
    }
    setSubmitting(true);
    setConsoleTab('output');
    setConsoleState({
      status: 'info',
      label: 'Проверка…',
      text: `Запуск на ${cases.length} автотест(ах) и отправка на сервер…`,
    });
    try {
      const runs = await runAgainstInputs(code, cases);
      const data = await submissionsApi.create({
        taskId: task.id,
        code,
        runs,
      });
      setSubmissions((prev) => [data.submission, ...prev]);
      const accepted = data.submission.status === 'ACCEPTED';
      setConsoleState({
        status: accepted ? 'ok' : 'fail',
        label: data.submission.status,
        text:
          `${data.message || ''}\n\n` +
          `Баллы за задачу: ${data.taskScore?.score ?? data.submission.score}/${task.points}\n` +
          `Штраф за ошибку: −${data.penaltyStep ?? taskPenalty} б. (${data.penaltyPercent ?? olympiad?.penaltyPercent}%)\n\n` +
          (data.submission.output || ''),
      });
      if (accepted) {
        toast.success(data.message || `Зачтено: ${data.taskScore?.score} б.`);
      } else {
        toast.error(data.message || 'Неверное решение');
      }
    } catch (err) {
      toast.error(err.message);
      setConsoleState({
        status: 'fail',
        label: 'ERROR',
        text: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const runRef = useRef(onRun);
  runRef.current = onRun;

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runRef.current?.();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return (
      <AppShell topbarTitle={`До конца ${formatCountdown(parts)}`}>
        <Skeleton height={420} />
      </AppShell>
    );
  }

  if (error || !olympiad) {
    return (
      <AppShell>
        <EmptyState title="Ошибка" description={error} />
      </AppShell>
    );
  }

  const isStaff = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';
  const isRegistered = Boolean(registration);
  const participationDone = registration?.status === 'COMPLETED';
  const resultsReady =
    olympiad.status === 'CLOSED' || olympiad.status === 'PUBLISHED';
  const solveBlocked = !isStaff && (!isRegistered || participationDone);

  if (solveBlocked) {
    const notRegistered = !isRegistered;
    return (
      <div className="solve-page">
        <AppShell topbarTitle={`До конца ${formatCountdown(parts)}`}>
          <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>
          <h1 className="page-title">
            {notRegistered ? 'Нет доступа к решению' : 'Участие завершено'}
          </h1>
          <p className="page-desc">{olympiad.title}</p>
          <EmptyState
            title="Ожидание результатов"
            description={
              notRegistered
                ? resultsReady
                  ? 'Вы не регистрировались на эту олимпиаду. Если итоги опубликованы — их можно посмотреть в разделе результатов.'
                  : 'Вы не зарегистрированы на олимпиаду — решение задач недоступно. Доступно только ожидание публикации результатов.'
                : resultsReady
                  ? 'Олимпиада завершена — можно открыть итоги.'
                  : 'Доступ к решению закрыт. Когда организатор опубликует итоги, появятся места и сертификат.'
            }
            action={
              <div className="row-wrap">
                {resultsReady ? (
                  <Link to={`/olympiads/${id}/results`} className="olimp-btn olimp-btn-primary">
                    К результатам
                  </Link>
                ) : (
                  <Link to={`/olympiads/${id}`} className="olimp-btn olimp-btn-primary">
                    В зал ожидания
                  </Link>
                )}
                {!notRegistered ? (
                  <Link to="/waiting" className="olimp-btn olimp-btn-outline">
                    Мои ожидания
                  </Link>
                ) : (
                  <Link to="/catalog" className="olimp-btn olimp-btn-outline">
                    Зарегистрироваться
                  </Link>
                )}
                <Link to="/catalog" className="olimp-btn olimp-btn-outline">
                  К каталогу
                </Link>
              </div>
            }
          />
        </AppShell>
      </div>
    );
  }

  const taskIndex = (olympiad.tasks || []).findIndex((t) => t.id === taskId);
  const best = task ? bestByTask[task.id] : null;

  return (
    <div className="solve-page">
      <AppShell topbarTitle={`До конца ${formatCountdown(parts)}`}>
        <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>
        <h1 className="page-title">Решение задач</h1>
        <p className="page-desc">
          {olympiad.title}
          {task ? ` — задача ${taskLetter(Math.max(0, taskIndex))}` : ''} — автосохранение включено
        </p>

        <div className="solve-status">
          <strong>
            {scoreSummary.earned} / {scoreSummary.max} баллов
          </strong>
          <span className="muted">
            Штраф за ошибку: −{taskPenalty} б. ({olympiad.penaltyPercent ?? 5}% от задачи)
          </span>
          <span className="muted">
            Сохранено{' '}
            {savedAt
              ? savedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </span>
          <div className="spacer" />
          <button
            type="button"
            className="olimp-btn olimp-btn-outline"
            onClick={() => setConfirmOpen(true)}
          >
            Завершить участие
          </button>
        </div>

        <Modal
          open={confirmOpen}
          title="Завершить участие?"
          onClose={() => {
            if (!finishing) setConfirmOpen(false);
          }}
          footer={
            <>
              <button
                type="button"
                className="olimp-btn olimp-btn-outline"
                disabled={finishing}
                onClick={() => setConfirmOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="olimp-btn olimp-btn-primary"
                disabled={finishing}
                onClick={onConfirmFinish}
              >
                {finishing ? 'Завершение…' : 'Да, завершить'}
              </button>
            </>
          }
        >
          <div className="stack">
            <p style={{ margin: 0 }}>
              После подтверждения доступ к решению задач будет закрыт навсегда для этой
              олимпиады — даже если вы не отправили ни одной посылки.
            </p>
            <p className="muted text-sm" style={{ margin: 0 }}>
              Останется только ожидание публикации результатов. Вернуться к редактору будет
              нельзя.
            </p>
            <div className="text-sm secondary">
              Текущий результат: {scoreSummary.earned} / {scoreSummary.max} баллов
            </div>
          </div>
        </Modal>

        {!task ? (
          <EmptyState title="Нет заданий" description="Разработчик ещё не добавил задачи." />
        ) : (
          <div className="solve-workspace">
            <section className="solve-col">
              <div className="solve-col-head">
                <span>Задачи и условие · 40%</span>
              </div>
              <div className="solve-task-tabs">
                {(olympiad.tasks || []).map((t, idx) => {
                  const b = bestByTask[t.id];
                  const label =
                    b?.status === 'ACCEPTED'
                      ? `${b.score}${b.wrongs ? ` (−${b.penaltyTaken})` : ''}`
                      : b?.wrongs
                        ? `0 (${b.wrongs}×)`
                        : String(t.points);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`solve-task-tab${t.id === taskId ? ' active' : ''}`}
                      onClick={() => setTaskId(t.id)}
                      title={
                        b?.status === 'ACCEPTED'
                          ? `Штраф: ${b.wrongs}×${b.penaltyStep} · время ${formatSolveDuration(b.solveMs)}`
                          : b?.wrongs
                            ? `Неверных попыток: ${b.wrongs}`
                            : undefined
                      }
                    >
                      {taskLetter(idx)} · {label}
                    </button>
                  );
                })}
              </div>
              <div className="solve-statement">
                {best?.status === 'ACCEPTED' ? (
                  <div className="solve-badge" style={{ marginBottom: 10 }}>
                    <div>
                      Решена · {best.score} / {task.points} баллов
                      {best.wrongs
                        ? ` · штраф −${best.penaltyTaken} (${best.wrongs}×${best.penaltyStep})`
                        : ''}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Время решения: {formatSolveDuration(best.solveMs)}
                      {best.wrongs
                        ? ` · неверных отправок до AC: ${best.wrongs}`
                        : ' · без штрафных попыток'}
                    </div>
                  </div>
                ) : best?.wrongs ? (
                  <div className="solve-badge" style={{ marginBottom: 10, opacity: 0.85 }}>
                    Неверных отправок: {best.wrongs} · при AC снимут −
                    {best.wrongs * taskPenalty} б. ({best.wrongs}×{taskPenalty})
                  </div>
                ) : null}
                <h3>
                  {taskLetter(Math.max(0, taskIndex))}. {task.title}
                </h3>
                <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
                  Время: 1 секунда · память: 64 МБ · {task.points} баллов
                </div>
                <pre>{task.statement}</pre>
                {(task.testCases || [])
                  .filter((tc) => tc.isSample)
                  .map((tc) => (
                    <div key={tc.id} className="solve-sample">
                      <div className="label">Входные данные</div>
                      <pre>{tc.input}</pre>
                      <div className="label">Выходные данные</div>
                      <pre style={{ marginBottom: 0 }}>{tc.expectedOutput}</pre>
                    </div>
                  ))}
              </div>
            </section>

            <div className="solve-right">
              <section className="solve-editor-wrap">
                <div className="solve-col-head">
                  <span>solution.py</span>
                  <span className="muted">Python 3.12 · Ln {cursor.line}, Col {cursor.col}</span>
                </div>
                <div className="solve-snippets">
                  <span className="solve-snippets-label">Подсказки:</span>
                  {PYTHON_SNIPPETS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="solve-snippet-chip"
                      title={s.detail}
                      onClick={() =>
                        insertSnippet(editorRef.current, monacoRef.current, s.insert)
                      }
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="solve-editor-body">
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value ?? '')}
                    beforeMount={(monaco) => {
                      monacoRef.current = monaco;
                      registerPythonLanguage(monaco);
                    }}
                    onMount={(editor, monaco) => {
                      editorRef.current = editor;
                      monacoRef.current = monaco;
                      registerPythonLanguage(monaco);
                      editor.onDidChangeCursorPosition((e) => {
                        setCursor({
                          line: e.position.lineNumber,
                          col: e.position.column,
                        });
                      });
                      // Ctrl+Space — явный вызов подсказок
                      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
                        editor.trigger('olimp', 'editor.action.triggerSuggest', {});
                      });
                    }}
                    options={getPythonEditorOptions()}
                  />
                </div>
                <div className="solve-editor-actions">
                  <button
                    type="button"
                    className="olimp-btn olimp-btn-outline"
                    onClick={onRun}
                    disabled={running}
                  >
                    {running ? 'Запуск…' : 'Запустить'}
                  </button>
                  <button
                    type="button"
                    className="olimp-btn olimp-btn-primary"
                    onClick={onSubmit}
                    disabled={submitting || olympiad.status !== 'LIVE'}
                  >
                    {submitting ? 'Отправка…' : 'Отправить'}
                  </button>
                  <span className="solve-hint">
                    Ctrl+Space — подсказки · Ctrl+Enter — запуск · автосохранение 5 с
                  </span>
                </div>
              </section>

              <section className="solve-console">
                <div className="solve-col-head">
                  <span>Консоль · 25%</span>
                  <div className="solve-console-tabs">
                    <button
                      type="button"
                      className={`solve-console-tab${consoleTab === 'output' ? ' active' : ''}`}
                      onClick={() => setConsoleTab('output')}
                    >
                      Вывод
                    </button>
                    <button
                      type="button"
                      className={`solve-console-tab${consoleTab === 'history' ? ' active' : ''}`}
                      onClick={() => setConsoleTab('history')}
                    >
                      История
                    </button>
                  </div>
                </div>
                <div className="solve-console-body">
                  {consoleTab === 'output' ? (
                    <>
                      <div className={`solve-console-status ${consoleState.status}`}>
                        {consoleState.label}
                      </div>
                      {consoleState.text}
                    </>
                  ) : submissions.length === 0 ? (
                    'Посылок пока нет'
                  ) : (
                    <div className="solve-history">
                      {submissions.slice(0, 15).map((s) => (
                        <div key={s.id} className="solve-history-item">
                          <span>
                            {s.task?.title || `#${s.taskId}`} · {s.status}
                          </span>
                          <span>{s.score} б.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </AppShell>
    </div>
  );
}
