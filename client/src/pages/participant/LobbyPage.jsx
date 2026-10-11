import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import { EmptyState, Skeleton, useToast } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';
import { countdownParts, formatCountdown, formatDate, roleLabel } from '../../utils/format';
import './results.css';

export default function LobbyPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [olympiad, setOlympiad] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [parts, setParts] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await olympiadsApi.get(id);
      setOlympiad(data.olympiad);
      setRegistration(data.registration);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const poll = window.setInterval(load, 15000);
    return () => window.clearInterval(poll);
  }, [id]);

  useEffect(() => {
    if (!olympiad) return undefined;
    const target =
      olympiad.status === 'OPEN'
        ? olympiad.startsAt
        : olympiad.status === 'LIVE'
          ? olympiad.endsAt
          : null;
    const tick = () => setParts(countdownParts(target));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [olympiad]);

  async function onRegister() {
    setBusy(true);
    try {
      const data = await olympiadsApi.register(id);
      setRegistration(data.registration);
      toast.success('Вы записаны на олимпиаду');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    setBusy(true);
    try {
      const data = await olympiadsApi.join(id);
      setRegistration(data.registration);
      toast.success('Вы вошли в олимпиаду');
      navigate(`/olympiads/${id}/solve`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !olympiad) {
    return (
      <AppShell>
        <Skeleton height={280} />
      </AppShell>
    );
  }

  if (error || !olympiad) {
    return (
      <AppShell>
        <EmptyState title="Ошибка" description={error} />
      </AppShell>
    );
  }

  const timerLabel =
    olympiad.status === 'OPEN'
      ? 'До старта'
      : olympiad.status === 'LIVE'
        ? 'До конца'
        : 'Таймер';

  const finishedParticipation = registration?.status === 'COMPLETED';
  const resultsReady =
    olympiad.status === 'CLOSED' || olympiad.status === 'PUBLISHED';

  return (
    <AppShell topbarTitle={`${timerLabel} ${formatCountdown(parts)}`}>
      <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>
      <h1 className="page-title">Зал ожидания</h1>
      <p className="page-desc">{olympiad.title}</p>

      <div className="grid-2" style={{ marginTop: 20, gap: 16 }}>
        <div className="results-panel stack">
          <div className="olimp-card-tags">
            <span className="olimp-tag">{olympiad.status}</span>
            {registration ? (
              <span className="olimp-tag">{registration.status}</span>
            ) : (
              <span className="olimp-tag">Не записан</span>
            )}
          </div>
          <div style={{ fontSize: 42, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {finishedParticipation
              ? 'ГОТОВО'
              : olympiad.status === 'LIVE' && parts?.finished === false
                ? formatCountdown(parts)
                : olympiad.status === 'LIVE'
                  ? 'LIVE'
                  : formatCountdown(parts)}
          </div>
          <p className="muted">
            {finishedParticipation
              ? resultsReady
                ? 'Участие завершено. Можно открыть результаты.'
                : 'Участие завершено. Ожидайте публикации результатов.'
              : olympiad.status === 'LIVE'
                ? 'Олимпиада идёт — можно присоединиться к решению'
                : olympiad.status === 'OPEN'
                  ? 'Ожидание старта. Запишитесь и следите за таймером.'
                  : 'Олимпиада не в активной фазе'}
          </p>
          <div className="text-sm secondary">
            Старт: {formatDate(olympiad.startsAt)} · Финиш: {formatDate(olympiad.endsAt)}
          </div>
          <div className="row-wrap" style={{ marginTop: 8 }}>
            {finishedParticipation || (!registration && olympiad.status !== 'OPEN') ? (
              <>
                {!registration ? (
                  <p className="muted" style={{ margin: 0, width: '100%' }}>
                    Вы не зарегистрированы — решение задач недоступно, только ожидание результатов.
                  </p>
                ) : null}
                {resultsReady ? (
                  <Link to={`/olympiads/${id}/results`} className="olimp-btn olimp-btn-primary">
                    К результатам
                  </Link>
                ) : (
                  <Link to="/waiting" className="olimp-btn olimp-btn-primary">
                    Ожидание результатов
                  </Link>
                )}
                {!registration && ['OPEN', 'LIVE'].includes(olympiad.status) ? (
                  <button
                    type="button"
                    className="olimp-btn olimp-btn-outline"
                    disabled={busy}
                    onClick={onRegister}
                  >
                    Записаться
                  </button>
                ) : null}
                <Link to="/catalog" className="olimp-btn olimp-btn-outline">
                  К каталогу
                </Link>
              </>
            ) : (
              <>
                {!registration && olympiad.status === 'OPEN' ? (
                  <button
                    type="button"
                    className="olimp-btn olimp-btn-outline"
                    disabled={busy}
                    onClick={onRegister}
                  >
                    Записаться
                  </button>
                ) : null}
                <button
                  type="button"
                  className="olimp-btn olimp-btn-primary"
                  disabled={busy || olympiad.status !== 'LIVE' || !registration}
                  onClick={onJoin}
                >
                  {busy ? 'Вход…' : 'Присоединиться'}
                </button>
                {olympiad.status === 'LIVE' && registration ? (
                  <Link to={`/olympiads/${id}/solve`} className="olimp-btn olimp-btn-outline">
                    К редактору
                  </Link>
                ) : null}
                <Link to="/catalog" className="olimp-btn olimp-btn-outline">
                  К каталогу
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="results-panel">
          <h3 style={{ marginTop: 0 }}>
            Участники ({olympiad.registrations?.length || 0})
          </h3>
          <div className="stack" style={{ gap: 8 }}>
            {(olympiad.registrations || []).length === 0 ? (
              <p className="muted">Пока никого нет</p>
            ) : (
              (olympiad.registrations || []).map((r) => (
                <div
                  key={r.id}
                  className="row"
                  style={{ justifyContent: 'space-between', gap: 8 }}
                >
                  <span>
                    {[r.user?.name, r.user?.lastName].filter(Boolean).join(' ') ||
                      r.user?.email}
                  </span>
                  <span className="olimp-tag">{r.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
