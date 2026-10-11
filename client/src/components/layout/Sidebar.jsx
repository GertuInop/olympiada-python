import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../hooks/useTheme';

const NAV = {
  PARTICIPANT: [
    { to: '/catalog', label: 'Олимпиады', end: true },
    { to: '/waiting', label: 'Зал ожидания' },
    { to: '/solve-hub', label: 'Решение задач' },
    { to: '/results', label: 'Результаты' },
    { to: '/help', label: 'Справка и правила' },
  ],
  DEVELOPER: [
    { to: '/dev/olympiads', label: 'Мои олимпиады', end: true },
    { to: '/profile', label: 'Профиль' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Дашборд', end: true },
    { to: '/admin/users', label: 'Пользователи' },
    { to: '/admin/olympiads', label: 'Олимпиады' },
    { to: '/admin/results', label: 'Результаты' },
    { to: '/profile', label: 'Профиль' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const links = NAV[user?.role] || NAV.PARTICIPANT;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img
          className="sidebar-logo"
          src="/olimp-logo-light.png"
          alt="OLIMP — Олимпиадные задачи на Python"
        />
      </div>

      <nav className="sidebar-nav">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={Boolean(item.end)}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="theme-toggle" onClick={toggle}>
          Настройки — {theme === 'light' ? 'Светлая тема' : 'Тёмная тема'}
        </button>
        <button type="button" className="sidebar-logout" onClick={logout}>
          Выйти
        </button>
      </div>
    </aside>
  );
}
