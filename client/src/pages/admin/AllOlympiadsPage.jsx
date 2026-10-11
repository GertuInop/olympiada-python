import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusPill,
} from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function AllOlympiadsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await olympiadsApi.list();
        if (alive) setItems(data.olympiads || []);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppShell title="Все олимпиады" meta="Админ">
      <PageHeader
        title="Олимпиады"
        description="Полный список олимпиад на платформе."
      />

      {error ? <div className="alert error mb-16">{error}</div> : null}

      <Card padding="none">
        {loading ? (
          <div className="card-pad">
            <Skeleton height={220} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Нет олимпиад" />
        ) : (
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Статус</th>
                  <th>Автор</th>
                  <th>Задания</th>
                  <th>Участники</th>
                  <th>Старт</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="fw-600">{o.title}</div>
                      <div className="text-xs muted">{o.description || '—'}</div>
                    </td>
                    <td>
                      <StatusPill status={o.status} />
                    </td>
                    <td className="text-sm">{o.createdBy?.name || o.createdBy?.email || '—'}</td>
                    <td>{o.tasksCount}</td>
                    <td>{o.participantsCount}</td>
                    <td className="text-sm">{formatDate(o.startsAt)}</td>
                    <td>
                      <Link to={`/olympiads/${o.id}/results`}>
                        <Button size="sm" variant="secondary">
                          Результаты
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
