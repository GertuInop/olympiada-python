import { useEffect, useState } from 'react';
import { adminApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusPill,
} from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function AdminResultsPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await adminApi.results();
        if (alive) setCertificates(data.certificates || []);
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
    <AppShell title="Результаты" meta="Сертификаты">
      <PageHeader
        title="Все результаты"
        description="Опубликованные сертификаты участников."
      />

      {error ? <div className="alert error mb-16">{error}</div> : null}

      <Card padding="none">
        {loading ? (
          <div className="card-pad">
            <Skeleton height={220} />
          </div>
        ) : certificates.length === 0 ? (
          <EmptyState
            title="Сертификатов пока нет"
            description="Они появятся после публикации итогов олимпиады."
          />
        ) : (
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Участник</th>
                  <th>Олимпиада</th>
                  <th>Баллы</th>
                  <th>Статус</th>
                  <th>Выдан</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="fw-600">{c.user?.name || '—'}</div>
                      <div className="text-xs muted">{c.user?.email}</div>
                    </td>
                    <td>{c.olympiad?.title}</td>
                    <td>
                      <Badge tone="primary">{c.score}</Badge>
                    </td>
                    <td>
                      <StatusPill status={c.olympiad?.status || 'PUBLISHED'} />
                    </td>
                    <td className="text-sm">{formatDate(c.issuedAt)}</td>
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
