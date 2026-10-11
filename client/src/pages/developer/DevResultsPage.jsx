import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusPill,
  useToast,
} from '../../components/ui';

function cellClass(score, max) {
  if (!score) return 'score-0';
  const ratio = max ? score / max : 0;
  if (ratio >= 0.9) return 'score-high';
  if (ratio >= 0.4) return 'score-mid';
  return 'score-low';
}

export default function DevResultsPage() {
  const { id } = useParams();
  const toast = useToast();
  const [olympiad, setOlympiad] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [oData, rData] = await Promise.all([
        olympiadsApi.get(id),
        olympiadsApi.results(id),
      ]);
      setOlympiad(oData.olympiad);
      setResults(rData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function onPublish() {
    setBusy(true);
    try {
      const data = await olympiadsApi.publish(id);
      setOlympiad((prev) => ({ ...prev, ...data.olympiad }));
      toast.success('Результаты опубликованы, сертификаты выданы');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Итоги">
        <Skeleton height={300} />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Итоги">
        <Card>
          <EmptyState title="Ошибка" description={error} />
        </Card>
      </AppShell>
    );
  }

  const tasks = results?.tasks || [];
  const rows = results?.rows || [];

  return (
    <AppShell title="Итоги олимпиады" meta={olympiad?.title}>
      <PageHeader
        title="Результаты и публикация"
        description="Тепловая карта баллов по заданиям. Публикация создаёт сертификаты."
        actions={
          <>
            <StatusPill status={olympiad?.status} />
            <Link to={`/dev/olympiads/${id}/constructor`}>
              <Button variant="secondary">Конструктор</Button>
            </Link>
            <Button
              onClick={onPublish}
              disabled={
                busy ||
                olympiad?.status === 'PUBLISHED' ||
                !['LIVE', 'CLOSED'].includes(olympiad?.status)
              }
            >
              {olympiad?.status === 'PUBLISHED'
                ? 'Уже опубликовано'
                : 'Опубликовать (места + сертификаты)'}
            </Button>
          </>
        }
      />

      <Card title="Тепловая карта" className="mb-16">
        {rows.length === 0 ? (
          <EmptyState title="Нет участников" />
        ) : (
          <div className="heatmap">
            <div className="heatmap-row">
              <div className="text-xs muted">Участник</div>
              {tasks.map((t) => (
                <div key={t.id} className="text-xs muted" style={{ textAlign: 'center' }} title={t.title}>
                  {t.title.slice(0, 1)}
                </div>
              ))}
            </div>
            {rows.map((row) => (
              <div key={row.user.id} className="heatmap-row">
                <div className="text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.user.name || row.user.email}
                </div>
                {tasks.map((t) => {
                  const cell = row.byTask[t.id] || { score: 0 };
                  return (
                    <div
                      key={t.id}
                      className={`heatmap-cell ${cellClass(cell.score, t.points)}`}
                      title={`${t.title}: ${cell.score}`}
                    >
                      {cell.score}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Участник</th>
                <th>Итого</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.user.id}>
                  <td>{idx + 1}</td>
                  <td>{row.user.name || row.user.email}</td>
                  <td className="fw-600">{row.total}</td>
                  <td>
                    <StatusPill status={row.registrationStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
