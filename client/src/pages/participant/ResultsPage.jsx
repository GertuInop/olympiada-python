import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import { EmptyState, Skeleton, useToast } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';
import { downloadCertificatePdf } from '../../lib/certificatePdf';
import { formatSolveDuration } from '../../lib/scoring';
import { roleLabel } from '../../utils/format';
import './results.css';

function taskLetter(index) {
  return String.fromCharCode(65 + index);
}

function displayName(user) {
  return [user?.name, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Участник';
}

export default function ResultsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [olympiad, setOlympiad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [results, oData] = await Promise.all([
          olympiadsApi.results(id),
          olympiadsApi.get(id),
        ]);
        if (!alive) return;
        setData(results);
        setOlympiad(oData.olympiad);
      } catch (err) {
        if (alive) setError(err.message || 'Ошибка');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const myRow = useMemo(
    () => (data?.rows || []).find((r) => r.user.id === user?.id) || null,
    [data, user]
  );

  const maxScore = data?.maxScore || (data?.tasks || []).reduce((s, t) => s + (t.points || 0), 0);
  const percent = myRow && maxScore ? Math.round((myRow.total / maxScore) * 100) : 0;

  async function onDownload() {
    if (!myRow) {
      toast.error('Нет результатов для сертификата');
      return;
    }
    setDownloading(true);
    try {
      const issued = await olympiadsApi.certificate(id);
      await downloadCertificatePdf({
        user: issued.certificate.user || user,
        olympiadTitle: olympiad?.title || issued.certificate.olympiad?.title,
        score: issued.certificate.score,
        maxScore: issued.maxScore,
        rank: issued.rank,
        participantsCount: issued.participantsCount,
        issuedAt: issued.certificate.issuedAt,
        code: issued.code,
      });
      toast.success('Сертификат скачан');
    } catch (err) {
      toast.error(err.message || 'Не удалось сформировать PDF');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <Skeleton height={320} />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <EmptyState title="Результаты недоступны" description={error} />
      </AppShell>
    );
  }

  const published = olympiad?.status === 'PUBLISHED';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';
  const canView =
    isStaff ||
    olympiad?.status === 'CLOSED' ||
    olympiad?.status === 'PUBLISHED';

  if (!canView) {
    return (
      <AppShell>
        <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>
        <EmptyState
          title="Итоги ещё не готовы"
          description={
            olympiad?.status === 'LIVE'
              ? 'Олимпиада идёт — места и сертификаты появятся после завершения и публикации.'
              : 'Результаты станут доступны после завершения олимпиады.'
          }
          action={
            <Link to={`/olympiads/${id}`} className="olimp-btn olimp-btn-primary">
              В зал ожидания
            </Link>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>

      <div className="results-head">
        <div>
          <h1 className="page-title">Результаты</h1>
          <p className="page-desc">{olympiad?.title}</p>
        </div>
        {published ? (
          <button
            type="button"
            className="olimp-btn olimp-btn-primary"
            onClick={onDownload}
            disabled={downloading || !myRow}
          >
            {downloading ? 'Формирование…' : 'Скачать PDF'}
          </button>
        ) : null}
      </div>

      <div className="results-kpis">
        <div className="results-kpi">
          <div className="label">Баллы</div>
          <div className="value">
            {myRow ? `${myRow.total} / ${maxScore}` : '—'}
          </div>
          <div className="hint">{myRow ? `${percent}% от максимума` : 'Нет участия'}</div>
        </div>
        <div className="results-kpi">
          <div className="label">Место</div>
          <div className="value">
            {published && myRow
              ? `${myRow.rank} / ${data.participantsCount || data.rows.length}`
              : '—'}
          </div>
          <div className="hint">
            {published ? 'Итоговая таблица' : 'Места после публикации'}
          </div>
        </div>
        <div className="results-kpi">
          <div className="label">Решено задач</div>
          <div className="value">
            {myRow ? `${myRow.solved} / ${(data.tasks || []).length}` : '—'}
          </div>
          <div className="hint">
            {myRow?.partial ? `${myRow.partial} частично` : 'По лучшим посылкам'}
          </div>
        </div>
      </div>

      <div className="results-mid">
        <div className="results-panel">
          <h3>Баллы по задачам</h3>
          {(data.tasks || []).length === 0 ? (
            <p className="muted">Задач нет</p>
          ) : (
            (data.tasks || []).map((t, idx) => {
              const cell = myRow?.byTask?.[t.id] || {
                score: 0,
                wrongs: 0,
                penaltyTaken: 0,
                solveMs: null,
              };
              const width = t.points ? Math.round((cell.score / t.points) * 100) : 0;
              return (
                <div key={t.id} className="task-score-block">
                  <div className="task-score-row">
                    <strong>{taskLetter(idx)}</strong>
                    <div className="task-score-bar">
                      <span style={{ width: `${width}%` }} />
                    </div>
                    <span className="task-score-points">
                      {cell.score}/{t.points}
                    </span>
                  </div>
                  <div className="task-score-meta">
                    {cell.wrongs > 0 ? (
                      <span className="task-penalty">
                        Штраф −{cell.penaltyTaken || cell.wrongs * (cell.penaltyStep || 0)} (
                        {cell.wrongs} неверн. × {cell.penaltyStep || '—'})
                      </span>
                    ) : cell.status === 'ACCEPTED' ? (
                      <span className="muted">Без штрафных попыток</span>
                    ) : (
                      <span className="muted">Не решена</span>
                    )}
                    <span className="task-time">
                      Время: {formatSolveDuration(cell.solveMs)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="results-panel">
          <h3>Сертификат</h3>
          {published ? (
            <>
              <div className="cert-preview">
                <img className="cert-logo" src="/olimp-logo-light.png" alt="OLIMP" />
                <div className="cert-title">СЕРТИФИКАТ</div>
                <div className="cert-name">{displayName(user)}</div>
                <div className="cert-meta">{olympiad?.title}</div>
                <div className="cert-meta">
                  {myRow
                    ? `${myRow.total}/${maxScore} баллов · ${myRow.rank} место`
                    : 'Нет данных для сертификата'}
                </div>
                <div className="cert-meta">
                  {new Date().toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <button
                type="button"
                className="olimp-btn olimp-btn-primary"
                style={{ width: '100%', marginTop: 12 }}
                onClick={onDownload}
                disabled={downloading || !myRow}
              >
                {downloading ? 'Формирование…' : 'Скачать сертификат PDF'}
              </button>
            </>
          ) : (
            <p className="muted">
              Сертификат и официальные места появятся после публикации результатов
              организатором.
            </p>
          )}
        </div>
      </div>

      <div className="results-panel" style={{ marginBottom: 14 }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Итоговая таблица</h3>
          <Link to={`/olympiads/${id}`} className="olimp-btn olimp-btn-outline">
            К лобби
          </Link>
        </div>
        <div className="results-table-wrap" style={{ border: 'none', marginBottom: 0 }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Место</th>
                <th>Участник</th>
                {(data.tasks || []).map((t, idx) => (
                  <th key={t.id}>{taskLetter(idx)}</th>
                ))}
                <th>Итого</th>
              </tr>
            </thead>
            <tbody>
              {(data.rows || []).length === 0 ? (
                <tr>
                  <td colSpan={(data.tasks?.length || 0) + 3}>
                    <EmptyState title="Нет данных" description="Пока нет участников или посылок." />
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.user.id} className={row.user.id === user?.id ? 'is-me' : undefined}>
                    <td>{published ? row.rank : '—'}</td>
                    <td>{displayName(row.user)}</td>
                    {(data.tasks || []).map((t) => {
                      const cell = row.byTask[t.id] || {};
                      return (
                        <td key={t.id} className="results-task-cell">
                          <div className="fw-600">{cell.score ?? 0}</div>
                          {cell.wrongs > 0 ? (
                            <div className="results-cell-meta task-penalty">
                              −{cell.penaltyTaken} ({cell.wrongs}×)
                            </div>
                          ) : null}
                          <div className="results-cell-meta">
                            {formatSolveDuration(cell.solveMs)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="fw-600">{row.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="results-note">
        Баллы: полные за задачу при AC минус штраф за каждую неверную попытку до AC (
        {data?.penaltyPercent ?? olympiad?.penaltyPercent ?? 5}% от баллов задачи, вверх).
        При равных баллах выше тот, кто быстрее решил больше задач.
        {published
          ? ' Сертификат — после публикации.'
          : ' Официальные места и сертификаты — после публикации.'}
      </p>
    </AppShell>
  );
}
