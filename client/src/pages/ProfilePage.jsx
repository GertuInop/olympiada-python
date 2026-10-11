import AppShell from '../components/layout/AppShell';
import { Badge, Card, PageHeader, StatusPill } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { formatDate, roleLabel } from '../utils/format';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <AppShell title="Профиль" meta={user?.email}>
      <PageHeader
        title="Профиль"
        description="Данные текущего аккаунта."
      />
      <Card padding="lg" className="stack" style={{ maxWidth: 560 }}>
        <div className="row gap-8">
          <Badge tone="primary">{roleLabel(user?.role)}</Badge>
          <StatusPill status={user?.status || 'ACTIVE'} />
        </div>
        <div>
          <div className="text-sm muted">Имя</div>
          <div className="text-lg fw-600">{user?.name || '—'}</div>
        </div>
        <div>
          <div className="text-sm muted">Email</div>
          <div className="text-lg fw-600">{user?.email}</div>
        </div>
        <div>
          <div className="text-sm muted">ID</div>
          <div className="mono">{user?.id}</div>
        </div>
        <div>
          <div className="text-sm muted">Создан</div>
          <div>{formatDate(user?.createdAt)}</div>
        </div>
      </Card>
    </AppShell>
  );
}
