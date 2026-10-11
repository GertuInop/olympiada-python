import { useAuth } from '../../auth/AuthContext';
import { roleLabel } from '../../utils/format';

export default function Topbar({ title = 'Олимпиадные задачи на Python' }) {
  const { user } = useAuth();
  const fullName =
    [user?.name, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Пользователь';

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-user">
        {fullName} · {roleLabel(user?.role)}
      </div>
    </header>
  );
}
