import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homePathForRole, useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui';
import AuthLayout from './AuthLayout';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Добро пожаловать!');
      navigate(homePathForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Авторизация">
      <form className="olimp-auth-fields" onSubmit={onSubmit}>
        <div className="olimp-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="olimp-field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error ? <div className="olimp-auth-error">{error}</div> : null}
        <div className="olimp-auth-actions">
          <button className="olimp-btn olimp-btn-primary" type="submit" disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </button>
          <div className="olimp-auth-or">или</div>
          <Link className="olimp-btn olimp-btn-outline" to="/register">
            Зарегистрироваться
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
