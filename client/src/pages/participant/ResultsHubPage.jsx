import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import { EmptyState, Skeleton } from '../../components/ui';
import { roleLabel } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const STATUS_TAG = {
  CLOSED: 'Завершена',
  PUBLISHED: 'Результаты',
};

export default function ResultsHubPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    olympiadsApi
      .list()
      .then((data) => setItems(data.olympiads || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // LIVE / OPEN не показываем — итоги и сертификаты только после завершения
  const ready = useMemo(
    () => items.filter((o) => ['CLOSED', 'PUBLISHED'].includes(o.status)),
    [items]
  );

  return (
    <AppShell>
      <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>
      <h1 className="page-title">Результаты</h1>
      <p className="page-desc">
        Итоговые таблицы и сертификаты появляются после завершения олимпиады.
      </p>

      {error ? <div className="alert error" style={{ marginTop: 16 }}>{error}</div> : null}
      {loading ? (
        <Skeleton height={180} />
      ) : ready.length === 0 ? (
        <EmptyState
          title="Пока нет итогов"
          description="Пока олимпиада идёт (LIVE), результаты и места недоступны."
        />
      ) : (
        <div className="olimp-cards" style={{ marginTop: 24 }}>
          {ready.map((o) => (
            <article key={o.id} className="olimp-card">
              <div className="olimp-card-tags">
                <span className="olimp-tag">{STATUS_TAG[o.status] || o.status}</span>
              </div>
              <h3 className="olimp-card-title">{o.title}</h3>
              <div className="olimp-card-actions">
                <Link to={`/olympiads/${o.id}/results`} className="olimp-btn olimp-btn-outline">
                  Открыть результаты
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
