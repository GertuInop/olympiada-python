import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
} from '../../components/ui';
import { formatDate, roleLabel } from '../../utils/format';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await adminApi.dashboard();
        if (alive) setData(res);
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
    <AppShell title="Админ-панель" meta="Обзор платформы">
      <PageHeader
        title="Дашборд"
        description="Ключевые метрики платформы Olympiad Constructor."
        actions={
          <>
            <Link to="/admin/users">
              <Button variant="secondary">Пользователи</Button>
            </Link>
            <Link to="/admin/olympiads">
              <Button>Олимпиады</Button>
            </Link>
          </>
        }
      />

      {error ? <div className="alert error mb-16">{error}</div> : null}

      {loading || !data ? (
        <div className="kpi-grid">
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={100} />
        </div>
      ) : (
        <>
          <div className="kpi-grid mb-16">
            {[
              ['Пользователи', data.kpis.users],
              ['Олимпиады', data.kpis.olympiads],
              ['Посылки', data.kpis.submissions],
              ['Регистрации', data.kpis.registrations],
            ].map(([label, value]) => (
              <Card key={label}>
                <div className="text-sm muted">{label}</div>
                <div className="text-2xl mt-8">{value}</div>
              </Card>
            ))}
          </div>

          <div className="grid-12">
            <div className="col-6">
              <Card title="По ролям">
                <div className="stack-sm">
                  {(data.byRole || []).map((r) => (
                    <div key={r.role} className="row-between">
                      <span>{roleLabel(r.role)}</span>
                      <Badge tone="primary">{r._count.role}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="col-6">
              <Card title="Олимпиады по статусам">
                <div className="stack-sm">
                  {(data.byStatus || []).map((s) => (
                    <div key={s.status} className="row-between">
                      <span>{s.status}</span>
                      <Badge>{s._count.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="col-12 mt-16">
              <Card title="Недавние пользователи">
                {(data.recentUsers || []).length === 0 ? (
                  <EmptyState title="Пусто" />
                ) : (
                  <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Имя</th>
                          <th>Email</th>
                          <th>Роль</th>
                          <th>Создан</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentUsers.map((u) => (
                          <tr key={u.id}>
                            <td>{u.name || '—'}</td>
                            <td>{u.email}</td>
                            <td>
                              <Badge tone="primary">{roleLabel(u.role)}</Badge>
                            </td>
                            <td className="text-sm">{formatDate(u.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
