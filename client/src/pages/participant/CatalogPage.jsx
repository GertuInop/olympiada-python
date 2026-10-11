import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import { EmptyState, Modal, SkeletonCard, useToast } from '../../components/ui';
import { formatDate, roleLabel } from '../../utils/format';
import { useAuth } from '../../auth/AuthContext';

const TABS = [
  { value: 'ALL', label: 'Все олимпиады' },
  { value: 'MINE', label: 'Мои регистрации' },
  { value: 'DONE', label: 'Завершённые' },
];

const STATUS_TAG = {
  OPEN: 'Регистрация',
  LIVE: 'Идёт',
  CLOSED: 'Завершена',
  PUBLISHED: 'Результаты',
  DRAFT: 'Черновик',
};

function difficultyLabel(olympiad) {
  const n = olympiad.tasksCount || 0;
  if (n <= 2) return 'Базовый';
  if (n <= 4) return 'Средний';
  return 'Продвинутый';
}

export default function CatalogPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await olympiadsApi.list();
      setItems(data.olympiads || []);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((o) => {
      if (tab === 'MINE' && !o.registered) return false;
      if (tab === 'DONE' && !['CLOSED', 'PUBLISHED'].includes(o.status)) return false;

      const q = query.trim().toLowerCase();
      if (q && !`${o.title} ${o.description || ''}`.toLowerCase().includes(q)) return false;

      if (status !== 'ALL' && o.status !== status) return false;
      if (difficulty !== 'ALL' && difficultyLabel(o) !== difficulty) return false;

      return true;
    });
  }, [items, tab, query, status, difficulty]);

  async function confirmRegister() {
    if (!selected) return;
    setBusy(true);
    try {
      await olympiadsApi.register(selected.id);
      toast.success('Вы зарегистрированы');
      setSelected(null);
      await load();
      navigate(`/olympiads/${selected.id}`);
    } catch (err) {
      toast.error(err.message || 'Не удалось записаться');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="page-crumb">OLIMP / {roleLabel(user?.role).toUpperCase()}</div>
      <h1 className="page-title">Олимпиады</h1>
      <p className="page-desc">
        Выберите соревнование, зарегистрируйтесь и перейдите в зал ожидания или к решению задач.
      </p>

      <div className="olimp-tabs">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`olimp-tab${tab === t.value ? ' active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="olimp-filters">
        <input
          placeholder="Поиск"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поиск"
        />
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Сложность">
          <option value="ALL">Сложность</option>
          <option value="Базовый">Базовый</option>
          <option value="Средний">Средний</option>
          <option value="Продвинутый">Продвинутый</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Статус">
          <option value="ALL">Статус</option>
          <option value="OPEN">Регистрация</option>
          <option value="LIVE">Идёт</option>
          <option value="CLOSED">Завершена</option>
          <option value="PUBLISHED">Результаты</option>
        </select>
        <button type="button" className="olimp-btn olimp-btn-outline" onClick={load}>
          Найти
        </button>
      </div>

      {error ? <div className="alert error mb-16">{error}</div> : null}

      {loading ? (
        <div className="olimp-cards">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Олимпиады не найдены"
          description="Измените фильтры или поисковый запрос."
        />
      ) : (
        <div className="olimp-cards">
          {filtered.map((o) => (
            <article key={o.id} className="olimp-card">
              <div className="olimp-card-tags">
                <span className="olimp-tag">{STATUS_TAG[o.status] || o.status}</span>
                <span className="olimp-tag">{difficultyLabel(o)}</span>
              </div>
              <h3 className="olimp-card-title">{o.title}</h3>
              <div className="olimp-card-meta">
                <div>Тема: {o.description || 'Python'}</div>
                <div>Старт: {formatDate(o.startsAt)}</div>
                <div>Финиш: {formatDate(o.endsAt)}</div>
                <div>Задач: {o.tasksCount} · Участников: {o.participantsCount}</div>
              </div>
              <div className="olimp-card-actions">
                {o.status === 'OPEN' && !o.registered ? (
                  <button
                    type="button"
                    className="olimp-btn olimp-btn-outline"
                    onClick={() => setSelected(o)}
                  >
                    Участвовать
                  </button>
                ) : null}

                {(o.status === 'OPEN' || o.status === 'LIVE') && o.registered ? (
                  <Link to={`/olympiads/${o.id}`} className="olimp-btn olimp-btn-primary">
                    Перейти в зал
                  </Link>
                ) : null}

                {o.status === 'LIVE' &&
                o.registered &&
                o.registrationStatus !== 'COMPLETED' ? (
                  <Link to={`/olympiads/${o.id}/solve`} className="olimp-btn olimp-btn-outline">
                    Решать
                  </Link>
                ) : null}

                {o.status === 'LIVE' &&
                (!o.registered || o.registrationStatus === 'COMPLETED') ? (
                  <Link to={`/olympiads/${o.id}`} className="olimp-btn olimp-btn-outline">
                    Ожидание результатов
                  </Link>
                ) : null}

                {o.status === 'PUBLISHED' || o.status === 'CLOSED' ? (
                  <Link to={`/olympiads/${o.id}/results`} className="olimp-btn olimp-btn-outline">
                    Результаты
                  </Link>
                ) : null}
              </div>
              {o.registered ? (
                <div className="olimp-card-note">Вы зарегистрированы</div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        title="Регистрация на олимпиаду"
        onClose={() => setSelected(null)}
        footer={
          <>
            <button type="button" className="olimp-btn olimp-btn-outline" onClick={() => setSelected(null)}>
              Отмена
            </button>
            <button
              type="button"
              className="olimp-btn olimp-btn-primary"
              disabled={busy}
              onClick={confirmRegister}
            >
              {busy ? 'Запись…' : 'Подтвердить'}
            </button>
          </>
        }
      >
        {selected ? (
          <div className="stack">
            <strong>{selected.title}</strong>
            <p className="muted">{selected.description || 'Без описания'}</p>
            <div className="text-sm secondary">
              Старт: {formatDate(selected.startsAt)} · Финиш: {formatDate(selected.endsAt)}
            </div>
            <div className="text-sm secondary">
              Задач: {selected.tasksCount} · Участников: {selected.participantsCount}
            </div>
            <p className="text-sm muted">
              После регистрации вы попадёте в зал ожидания. Решение откроется, когда олимпиада
              перейдёт в статус LIVE.
            </p>
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
