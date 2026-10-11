import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import { EmptyState, Skeleton } from '../../components/ui';
import { formatDate, roleLabel } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

export default function WaitingHubPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    olympiadsApi
      .list()
      .then((data) => setItems((data.olympiads || []).filter((o) => o.registered)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>
      <h1 className="page-title">Зал ожидания</h1>
      <p className="page-desc">Олимпиады, на которые вы зарегистрированы.</p>

      {loading ? (
        <Skeleton height={160} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Пока пусто"
          description="Сначала зарегистрируйтесь на олимпиаду в разделе «Олимпиады»."
          action={
            <Link to="/catalog" className="olimp-btn olimp-btn-primary">
              К олимпиадам
            </Link>
          }
        />
      ) : (
        <div className="olimp-cards" style={{ marginTop: 24 }}>
          {items.map((o) => {
            const done = o.registrationStatus === 'COMPLETED';
            const resultsReady = o.status === 'CLOSED' || o.status === 'PUBLISHED';
            return (
              <article key={o.id} className="olimp-card">
                <div className="olimp-card-tags">
                  <span className="olimp-tag">{o.status}</span>
                  {done ? <span className="olimp-tag">Завершил</span> : null}
                </div>
                <h3 className="olimp-card-title">{o.title}</h3>
                <div className="olimp-card-meta">
                  <div>
                    {done
                      ? resultsReady
                        ? 'Участие завершено — итоги доступны'
                        : 'Участие завершено — ожидание результатов'
                      : `Статус олимпиады: ${o.status}`}
                  </div>
                  <div>Старт: {formatDate(o.startsAt)}</div>
                </div>
                <div className="olimp-card-actions">
                  {done && resultsReady ? (
                    <Link to={`/olympiads/${o.id}/results`} className="olimp-btn olimp-btn-primary">
                      К результатам
                    </Link>
                  ) : (
                    <Link to={`/olympiads/${o.id}`} className="olimp-btn olimp-btn-primary">
                      Перейти в зал
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
