import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { olympiadsApi, tasksApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
  StatusPill,
  Tabs,
  useToast,
} from '../../components/ui';
import {
  getPythonEditorOptions,
  registerPythonLanguage,
} from '../../lib/monacoPython';
import { fillOutputsFromReference, runTests } from '../../lib/pyodideRunner';
import { formatDateTimeLocal } from '../../utils/format';
import './constructor.css';

const DEFAULT_REF = `n = int(input())
print(n * 2)
`;

const emptyTask = () => ({
  title: '',
  statement: '',
  referenceCode: DEFAULT_REF,
  points: 100,
  order: 0,
  testCases: [
    { input: '2\n', expectedOutput: '4', isSample: true },
    { input: '5\n', expectedOutput: '10', isSample: false },
  ],
});

function taskFromApi(task) {
  return {
    title: task.title || '',
    statement: task.statement || '',
    referenceCode: task.referenceCode || DEFAULT_REF,
    points: task.points ?? 100,
    order: task.order ?? 0,
    testCases: task.testCases?.length
      ? task.testCases.map((tc) => ({
          input: tc.input ?? '',
          expectedOutput: tc.expectedOutput ?? '',
          isSample: Boolean(tc.isSample),
        }))
      : emptyTask().testCases,
  };
}

export default function ConstructorPage() {
  const { id } = useParams();
  const toast = useToast();
  const [olympiad, setOlympiad] = useState(null);
  const [meta, setMeta] = useState({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    penaltyPercent: 5,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(emptyTask());
  const [tab, setTab] = useState('statement');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checkReport, setCheckReport] = useState(null);
  const [error, setError] = useState('');

  async function load(preferTaskId) {
    setLoading(true);
    setError('');
    try {
      const data = await olympiadsApi.get(id);
      const o = data.olympiad;
      setOlympiad(o);
      setMeta({
        title: o.title || '',
        description: o.description || '',
        startsAt: formatDateTimeLocal(o.startsAt),
        endsAt: formatDateTimeLocal(o.endsAt),
        penaltyPercent: o.penaltyPercent ?? 5,
      });

      const tasks = o.tasks || [];
      const pick =
        (preferTaskId && tasks.find((t) => t.id === preferTaskId)) ||
        tasks.find((t) => t.id === selectedId) ||
        tasks[0] ||
        null;

      if (pick) {
        setSelectedId(pick.id);
        setDraft(taskFromApi(pick));
      } else {
        setSelectedId(null);
        setDraft(emptyTask());
      }
      setCheckReport(null);
    } catch (err) {
      setError(err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tasks = olympiad?.tasks || [];

  function selectTask(task) {
    setSelectedId(task.id);
    setDraft(taskFromApi(task));
    setTab('statement');
    setCheckReport(null);
  }

  function updateTest(index, patch) {
    setDraft((d) => {
      const next = [...d.testCases];
      next[index] = { ...next[index], ...patch };
      return { ...d, testCases: next };
    });
    setCheckReport(null);
  }

  async function saveMeta() {
    setSaving(true);
    try {
      const data = await olympiadsApi.update(id, {
        title: meta.title,
        description: meta.description,
        startsAt: meta.startsAt || null,
        endsAt: meta.endsAt || null,
        penaltyPercent: Math.max(
          0,
          Math.min(100, Number(meta.penaltyPercent ?? 5) || 0)
        ),
      });
      setOlympiad((prev) => ({ ...prev, ...data.olympiad, tasks: prev.tasks }));
      toast.success('Метаданные сохранены');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function createTask() {
    setSaving(true);
    try {
      const seed = emptyTask();
      const data = await tasksApi.create({
        olympiadId: Number(id),
        title: `Задание ${tasks.length + 1}`,
        statement:
          'Опишите условие задачи.\n\nВходные данные:\n...\n\nВыходные данные:\n...',
        referenceCode: seed.referenceCode,
        points: 100,
        order: tasks.length,
        testCases: seed.testCases,
      });
      toast.success('Задание добавлено');
      await load(data.task.id);
      setTab('statement');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveTask() {
    if (!selectedId) return;
    if (!draft.title.trim() || !draft.statement.trim()) {
      toast.error('Укажите название и условие');
      setTab('statement');
      return;
    }
    if (!draft.testCases.length) {
      toast.error('Добавьте хотя бы один тест');
      setTab('tests');
      return;
    }
    setSaving(true);
    try {
      const data = await tasksApi.update(selectedId, {
        title: draft.title.trim(),
        statement: draft.statement,
        referenceCode: draft.referenceCode,
        points: Number(draft.points) || 0,
        order: Number(draft.order) || 0,
        testCases: draft.testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: Boolean(tc.isSample),
        })),
      });
      toast.success('Задание сохранено');
      setOlympiad((prev) => ({
        ...prev,
        tasks: (prev.tasks || []).map((t) => (t.id === data.task.id ? data.task : t)),
      }));
      setDraft(taskFromApi(data.task));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeTask() {
    if (!selectedId) return;
    if (!window.confirm('Удалить задание?')) return;
    setSaving(true);
    try {
      await tasksApi.remove(selectedId);
      toast.success('Задание удалено');
      setSelectedId(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function generateOutputs() {
    if (!draft.referenceCode?.trim()) {
      toast.error('Сначала напишите эталонное решение');
      setTab('reference');
      return;
    }
    if (!draft.testCases.length) {
      toast.error('Добавьте тесты с входными данными');
      setTab('tests');
      return;
    }
    setGenerating(true);
    try {
      const filled = await fillOutputsFromReference(draft.referenceCode, draft.testCases);
      const errors = filled.filter((t) => t._error);
      setDraft((d) => ({
        ...d,
        testCases: filled.map(({ _error, ...tc }) => tc),
      }));
      if (errors.length) {
        toast.error(`Эталон упал на ${errors.length} тест(ах)`);
        setCheckReport({
          ok: false,
          output: errors
            .map((t, i) => `Тест #${i + 1}: ${t._error}`)
            .join('\n\n'),
        });
      } else {
        toast.success('Ожидаемый вывод заполнен из эталона');
        setCheckReport(null);
      }
      setTab('tests');
    } catch (err) {
      toast.error(err.message || 'Не удалось запустить эталон');
    } finally {
      setGenerating(false);
    }
  }

  async function checkRef() {
    if (!draft.referenceCode?.trim()) {
      toast.error('Нет эталонного кода');
      setTab('reference');
      return;
    }
    if (!draft.testCases.length) {
      toast.error('Нет тестов');
      setTab('tests');
      return;
    }
    setChecking(true);
    setCheckReport(null);
    try {
      // Сохраняем перед проверкой, чтобы участники видели актуальные тесты
      if (selectedId) {
        await tasksApi.update(selectedId, {
          title: draft.title.trim() || 'Без названия',
          statement: draft.statement || '…',
          referenceCode: draft.referenceCode,
          points: Number(draft.points) || 0,
          order: Number(draft.order) || 0,
          testCases: draft.testCases,
        });
      }
      const result = await runTests(draft.referenceCode, draft.testCases);
      setCheckReport(result);
      toast[result.ok ? 'success' : 'error'](
        result.ok
          ? `Эталон проходит все ${result.results.length} тест(ов)`
          : 'Эталон не проходит часть тестов'
      );
      setTab('tests');
    } catch (err) {
      toast.error(err.message || 'Ошибка проверки');
    } finally {
      setChecking(false);
    }
  }

  const sampleCount = useMemo(
    () => draft.testCases.filter((t) => t.isSample).length,
    [draft.testCases]
  );
  const hiddenCount = draft.testCases.length - sampleCount;

  if (loading) {
    return (
      <AppShell title="Конструктор">
        <Skeleton height={360} />
      </AppShell>
    );
  }

  if (error || !olympiad) {
    return (
      <AppShell title="Конструктор">
        <Card>
          <EmptyState title="Ошибка" description={error} />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Конструктор" meta={olympiad.title}>
      <div className="sticky-toolbar">
        <div className="row wrap">
          <StatusPill status={olympiad.status} />
          <span className="text-sm muted">
            {selectedId ? `Задание #${selectedId}` : 'Нет выбранного задания'}
          </span>
        </div>
        <div className="row wrap">
          <Link to={`/dev/olympiads/${id}/lifecycle`}>
            <Button variant="secondary" size="sm">
              Жизненный цикл
            </Button>
          </Link>
          <Link to={`/dev/olympiads/${id}/results`}>
            <Button variant="ghost" size="sm">
              Результаты
            </Button>
          </Link>
          <Button size="sm" onClick={saveTask} disabled={!selectedId || saving}>
            {saving ? 'Сохранение…' : 'Сохранить задание'}
          </Button>
        </div>
      </div>

      <PageHeader
        title="Конструктор заданий"
        description="Опишите условие, добавьте примеры ввода/вывода, эталонное решение и автотесты (ожидаемый вывод в консоль)."
      />

      <div className="constructor-layout">
        <div className="stack">
          <Card title="Олимпиада" className="stack">
            <Input
              label="Название"
              value={meta.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            />
            <Input
              label="Описание"
              as="textarea"
              value={meta.description}
              onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
            />
            <Input
              label="Начало"
              type="datetime-local"
              value={meta.startsAt}
              onChange={(e) => setMeta((m) => ({ ...m, startsAt: e.target.value }))}
            />
            <Input
              label="Окончание"
              type="datetime-local"
              value={meta.endsAt}
              onChange={(e) => setMeta((m) => ({ ...m, endsAt: e.target.value }))}
            />
            <Input
              label="Штраф за неверную посылку, %"
              type="number"
              min={0}
              max={100}
              value={meta.penaltyPercent}
              onChange={(e) => setMeta((m) => ({ ...m, penaltyPercent: e.target.value }))}
              hint="От баллов задачи. Пример: 100 б. и 5% → −5 за каждую ошибку до AC (округление вверх)."
            />
            <Button onClick={saveMeta} disabled={saving}>
              Сохранить метаданные
            </Button>
          </Card>

          <Card
            title="Задания"
            subtitle={`${tasks.length} шт.`}
            actions={
              <Button size="sm" onClick={createTask} disabled={saving}>
                + Добавить
              </Button>
            }
          >
            {tasks.length === 0 ? (
              <EmptyState
                title="Нет заданий"
                description="Создайте первое задание для участников."
                action={<Button onClick={createTask}>Добавить задание</Button>}
              />
            ) : (
              <div className="stack-sm">
                {tasks.map((t, idx) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTask(t)}
                    className={`ctor-task-item${selectedId === t.id ? ' is-active' : ''}`}
                  >
                    <div>
                      <div className="fw-600">
                        {String.fromCharCode(65 + idx)}. {t.title}
                      </div>
                      <div className="text-xs muted">
                        {t.points} б. · тестов: {t.testCases?.length || 0}
                      </div>
                    </div>
                    <Badge tone="neutral">#{t.order + 1}</Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="stack-lg">
          {selectedId ? (
            <Card className="stack">
              <div className="row-between wrap">
                <Tabs
                  tabs={[
                    { value: 'statement', label: 'Условие' },
                    { value: 'samples', label: 'Примеры' },
                    { value: 'reference', label: 'Эталон' },
                    { value: 'tests', label: 'Автотесты' },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
                <div className="row wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={generateOutputs}
                    disabled={generating || checking || saving}
                  >
                    {generating ? 'Генерация…' : 'Вывод из эталона'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={checkRef}
                    disabled={checking || generating || saving}
                  >
                    {checking ? 'Проверка…' : 'Проверить эталон'}
                  </Button>
                  <Button variant="danger" size="sm" onClick={removeTask} disabled={saving}>
                    Удалить
                  </Button>
                </div>
              </div>

              {tab === 'statement' && (
                <div className="stack">
                  <p className="text-sm muted" style={{ margin: 0 }}>
                    Текст условия видят участники слева в редакторе. Опишите формат ввода и
                    вывода.
                  </p>
                  <Input
                    label="Название задания"
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  />
                  <div className="row">
                    <Input
                      label="Баллы"
                      type="number"
                      value={draft.points}
                      onChange={(e) => setDraft((d) => ({ ...d, points: e.target.value }))}
                    />
                    <Input
                      label="Порядок"
                      type="number"
                      value={draft.order}
                      onChange={(e) => setDraft((d) => ({ ...d, order: e.target.value }))}
                    />
                  </div>
                  <Input
                    label="Условие"
                    as="textarea"
                    value={draft.statement}
                    onChange={(e) => setDraft((d) => ({ ...d, statement: e.target.value }))}
                    style={{ minHeight: 280 }}
                    hint="Можно использовать простой текст. Примеры ввода/вывода добавьте во вкладке «Примеры»."
                  />
                </div>
              )}

              {tab === 'samples' && (
                <div className="stack">
                  <p className="text-sm muted" style={{ margin: 0 }}>
                    Примеры показываются участнику в условии. Отметьте тест галочкой «Пример»
                    или создайте отдельный sample ниже.
                  </p>
                  {draft.testCases.filter((t) => t.isSample).length === 0 ? (
                    <EmptyState
                      title="Нет примеров"
                      description="Отметьте тест как «Пример» во вкладке «Автотесты» или добавьте здесь."
                      action={
                        <Button
                          onClick={() => {
                            setDraft((d) => ({
                              ...d,
                              testCases: [
                                ...d.testCases,
                                { input: '', expectedOutput: '', isSample: true },
                              ],
                            }));
                          }}
                        >
                          + Пример
                        </Button>
                      }
                    />
                  ) : (
                    draft.testCases.map((tc, index) =>
                      tc.isSample ? (
                        <div key={index} className="ctor-test-card stack-sm">
                          <div className="row-between">
                            <strong>Пример #{index + 1}</strong>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateTest(index, { isSample: false })}
                            >
                              Скрыть из условия
                            </Button>
                          </div>
                          <label className="input-label">Входные данные (stdin)</label>
                          <textarea
                            className="code-area ctor-io"
                            value={tc.input}
                            onChange={(e) => updateTest(index, { input: e.target.value })}
                            spellCheck={false}
                          />
                          <label className="input-label">Выходные данные (stdout / консоль)</label>
                          <textarea
                            className="code-area ctor-io"
                            value={tc.expectedOutput}
                            onChange={(e) =>
                              updateTest(index, { expectedOutput: e.target.value })
                            }
                            spellCheck={false}
                          />
                        </div>
                      ) : null
                    )
                  )}
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        testCases: [
                          ...d.testCases,
                          { input: '', expectedOutput: '', isSample: true },
                        ],
                      }))
                    }
                  >
                    + Пример ввода/вывода
                  </Button>
                </div>
              )}

              {tab === 'reference' && (
                <div className="stack">
                  <p className="text-sm muted" style={{ margin: 0 }}>
                    Эталонное решение на Python. По нему можно сгенерировать ожидаемый вывод
                    автотестов и проверить, что все тесты зелёные.
                  </p>
                  <div className="ctor-editor">
                    <Editor
                      height="360px"
                      defaultLanguage="python"
                      theme="vs-dark"
                      value={draft.referenceCode}
                      onChange={(value) =>
                        setDraft((d) => ({ ...d, referenceCode: value ?? '' }))
                      }
                      beforeMount={(monaco) => registerPythonLanguage(monaco)}
                      options={{
                        ...getPythonEditorOptions(),
                        minimap: { enabled: false },
                      }}
                    />
                  </div>
                  <div className="row wrap">
                    <Button
                      variant="secondary"
                      onClick={generateOutputs}
                      disabled={generating}
                    >
                      {generating ? 'Запуск эталона…' : 'Заполнить выходы тестов из эталона'}
                    </Button>
                    <Button onClick={checkRef} disabled={checking}>
                      {checking ? 'Проверка…' : 'Прогнать все тесты'}
                    </Button>
                  </div>
                </div>
              )}

              {tab === 'tests' && (
                <div className="stack">
                  <div className="row-between wrap">
                    <p className="text-sm muted" style={{ margin: 0 }}>
                      Автотесты сравнивают stdout программы с ожидаемым выводом. Примеры
                      ({sampleCount}) видны участнику, скрытые ({hiddenCount}) — только для
                      проверки.
                    </p>
                    <div className="row wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={generateOutputs}
                        disabled={generating}
                      >
                        {generating ? '…' : 'Вывод из эталона'}
                      </Button>
                      <Button size="sm" onClick={checkRef} disabled={checking}>
                        {checking ? '…' : 'Проверить'}
                      </Button>
                    </div>
                  </div>

                  {checkReport ? (
                    <div
                      className={`ctor-report ${checkReport.ok ? 'is-ok' : 'is-fail'}`}
                    >
                      <div className="fw-600">
                        {checkReport.ok ? 'Эталон OK' : 'Есть ошибки'}
                      </div>
                      <pre>{checkReport.output}</pre>
                    </div>
                  ) : null}

                  {draft.testCases.map((tc, index) => (
                    <div key={index} className="ctor-test-card stack-sm">
                      <div className="row-between wrap">
                        <div className="row wrap">
                          <strong>Тест #{index + 1}</strong>
                          {tc.isSample ? (
                            <Badge tone="success">Пример</Badge>
                          ) : (
                            <Badge tone="neutral">Скрытый</Badge>
                          )}
                        </div>
                        <label className="row text-sm gap-8">
                          <input
                            type="checkbox"
                            checked={tc.isSample}
                            onChange={(e) =>
                              updateTest(index, { isSample: e.target.checked })
                            }
                          />
                          Показать как пример
                        </label>
                      </div>
                      <label className="input-label">Вход (то, что программа читает через input)</label>
                      <textarea
                        className="code-area ctor-io"
                        value={tc.input}
                        onChange={(e) => updateTest(index, { input: e.target.value })}
                        spellCheck={false}
                        placeholder={'2\n'}
                      />
                      <label className="input-label">
                        Ожидаемый вывод в консоль (stdout)
                      </label>
                      <textarea
                        className="code-area ctor-io"
                        value={tc.expectedOutput}
                        onChange={(e) =>
                          updateTest(index, { expectedOutput: e.target.value })
                        }
                        spellCheck={false}
                        placeholder="4"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            testCases: d.testCases.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Удалить тест
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="secondary"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        testCases: [
                          ...d.testCases,
                          { input: '', expectedOutput: '', isSample: false },
                        ],
                      }))
                    }
                  >
                    + Автотест
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <EmptyState
                title="Выберите или создайте задание"
                description="Автор описывает условие, примеры ввода/вывода, эталон и автотесты."
                action={<Button onClick={createTask}>Добавить задание</Button>}
              />
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
