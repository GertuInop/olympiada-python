import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homePathForRole, useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui';
import AuthLayout from './AuthLayout';

const initial = {
  name: '',
  lastName: '',
  email: '',
  phone: '',
  organization: '',
  password: '',
  passwordConfirm: '',
};

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.passwordConfirm) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name: form.name.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        organization: form.organization.trim() || undefined,
        password: form.password,
        role: 'PARTICIPANT',
      });
      toast.success('Аккаунт создан');
      navigate(homePathForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Регистрация">
      <form className="olimp-auth-fields" onSubmit={onSubmit}>
        <div className="olimp-auth-row">
          <div className="olimp-field">
            <label htmlFor="name">
              Имя<span className="req">*</span>
            </label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>
          <div className="olimp-field">
            <label htmlFor="lastName">
              Фамилия<span className="req">*</span>
            </label>
            <input
              id="lastName"
              value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="olimp-field">
          <label htmlFor="email">
            Email<span className="req">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="olimp-field">
          <label htmlFor="phone">Телефон</label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            autoComplete="tel"
          />
        </div>

        <div className="olimp-field">
          <label htmlFor="organization">Образовательная организация</label>
          <input
            id="organization"
            value={form.organization}
            onChange={(e) => setField('organization', e.target.value)}
            autoComplete="organization"
          />
        </div>

        <div className="olimp-field">
          <label htmlFor="password">
            Пароль<span className="req">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div className="olimp-field">
          <label htmlFor="passwordConfirm">
            Повторите пароль<span className="req">*</span>
          </label>
          <input
            id="passwordConfirm"
            type="password"
            value={form.passwordConfirm}
            onChange={(e) => setField('passwordConfirm', e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        {error ? <div className="olimp-auth-error">{error}</div> : null}

        <div className="olimp-auth-actions">
          <button className="olimp-btn olimp-btn-primary" type="submit" disabled={loading}>
            {loading ? 'Регистрация…' : 'Зарегистрироваться'}
          </button>
          <div className="olimp-auth-or">или</div>
          <Link className="olimp-btn olimp-btn-outline" to="/login">
            Авторизоваться
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
