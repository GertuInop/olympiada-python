import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './layout.css';

export default function AppShell({ children, topbarTitle }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title={topbarTitle} />
        <main className="app-content">
          <div className="app-content-inner">
            {children}
            <footer className="app-footer">
              Сайт создан в рамках курсовой работы в 2026 году
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
