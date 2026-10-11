import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import { EmptyState, Skeleton } from '../../components/ui';
import { roleLabel } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

export default function SolveHubPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    olympiadsApi
      .list()
      .then((data) =>
        setItems(
          (data.olympiads || []).filter(
            (o) =>
              o.status === 'LIVE' &&
              o.registered &&
              o.registrationStatus !== 'COMPLETED'
          )
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>
      <h1 className="page-title">Решение задач</h1>
      <p className="page-desc">Активные олимпиады, доступные для решения.</p>

      {loading ? (
        <Skeleton height={160} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Нет активных олимпиад"
          description="Когда олимпиада перейдёт в статус LIVE, она появится здесь."
        />
      ) : (
        <div className="olimp-cards" style={{ marginTop: 24 }}>
          {items.map((o) => (
            <article key={o.id} className="olimp-card">
              <h3 className="olimp-card-title">{o.title}</h3>
              <div className="olimp-card-actions">
                <Link to={`/olympiads/${o.id}/solve`} className="olimp-btn olimp-btn-primary">
                  Открыть редактор
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
