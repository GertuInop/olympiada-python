import './auth.css';

export default function AuthLayout({ title, children }) {
  return (
    <div className="olimp-auth">
      <section className="olimp-auth-form-side">
        <div className="olimp-auth-form-main">
          <h1 className="olimp-auth-title">{title}</h1>
          {children}
        </div>
        <footer className="olimp-auth-footer">
          Сайт создан в рамках курсовой работы в 2026 году
        </footer>
      </section>

      <aside className="olimp-auth-brand-side" aria-hidden="true">
        <img
          className="olimp-auth-logo"
          src="/olimp-logo.png"
          alt="OLIMP — Олимпиадные задачи на Python"
        />
      </aside>
    </div>
  );
}
