import AppShell from '../components/layout/AppShell';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../utils/format';

export default function HelpPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>
      <h1 className="page-title">Справка и правила</h1>
      <p className="page-desc">Кратко о работе платформы OLIMP.</p>
      <div className="stack" style={{ marginTop: 24, maxWidth: 720 }}>
        <p>1. Зарегистрируйтесь на олимпиаду в разделе «Олимпиады».</p>
        <p>2. Дождитесь старта в «Зале ожидания» и нажмите «Присоединиться».</p>
        <p>3. Решайте задачи в редакторе: условие слева, код и консоль справа.</p>
        <p>4. Результаты и сертификаты появятся после публикации организатором.</p>
      </div>
    </AppShell>
  );
}
