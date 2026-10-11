import { useEffect, useState } from 'react';
import { adminApi } from '../../api/client';
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
  useToast,
} from '../../components/ui';
import { formatDate, roleLabel } from '../../utils/format';

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.users();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patchUser(id, body) {
    try {
      const data = await adminApi.updateUser(id, body);
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
      toast.success('Пользователь обновлён');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="Пользователи" meta="Администрирование">
      <PageHeader
        title="Пользователи"
        description="Управление ролями и статусами аккаунтов."
        actions={
          <div style={{ width: 260 }}>
            <Input
              placeholder="Поиск…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      />

      {error ? <div className="alert error mb-16">{error}</div> : null}

      <Card padding="none">
        {loading ? (
          <div className="card-pad">
            <Skeleton height={240} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Пользователи не найдены" />
        ) : (
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Создан</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="fw-600">{u.name || '—'}</div>
                      <div className="text-xs muted">{u.email}</div>
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{ width: 160 }}
                        value={u.role}
                        onChange={(e) => patchUser(u.id, { role: e.target.value })}
                      >
                        <option value="PARTICIPANT">Участник</option>
                        <option value="DEVELOPER">Разработчик</option>
                        <option value="ADMIN">Админ</option>
                      </select>
                    </td>
                    <td>
                      <StatusPill status={u.status || 'ACTIVE'} />
                    </td>
                    <td className="text-sm">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="row wrap">
                        {u.status === 'BLOCKED' ? (
                          <Button size="sm" variant="secondary" onClick={() => patchUser(u.id, { status: 'ACTIVE' })}>
                            Разблокировать
                          </Button>
                        ) : (
                          <Button size="sm" variant="danger" onClick={() => patchUser(u.id, { status: 'BLOCKED' })}>
                            Блок
                          </Button>
                        )}
                        <Badge tone="neutral">{roleLabel(u.role)}</Badge>
                      </div>
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
