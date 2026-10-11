import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Skeleton,
  StatusPill,
  useToast,
} from '../../components/ui';
import { formatDate, formatDateTimeLocal } from '../../utils/format';

export default function MyOlympiadsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await olympiadsApi.list({ mine: true });
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

  const kpis = useMemo(() => {
    const total = items.length;
    const live = items.filter((o) => o.status === 'LIVE').length;
    const draft = items.filter((o) => o.status === 'DRAFT').length;
    const participants = items.reduce((s, o) => s + (o.participantsCount || 0), 0);
    return { total, live, draft, participants };
  }, [items]);

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await olympiadsApi.create({
        title: form.title,
        description: form.description,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      });
      toast.success('Олимпиада создана');
      setOpen(false);
      setForm({ title: '', description: '', startsAt: '', endsAt: '' });
      navigate(`/dev/olympiads/${data.olympiad.id}/constructor`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Мои олимпиады" meta="Конструктор заданий">
      <PageHeader
        title="Мои олимпиады"
        description="Создавайте олимпиады, настраивайте задания и управляйте жизненным циклом."
        actions={
          <Button onClick={() => setOpen(true)}>Создать олимпиаду</Button>
        }
      />

      <div className="kpi-grid mb-16">
        {[
          ['Всего', kpis.total],
          ['Идут сейчас', kpis.live],
          ['Черновики', kpis.draft],
          ['Участники', kpis.participants],
        ].map(([label, value]) => (
          <Card key={label}>
            <div className="text-sm muted">{label}</div>
            <div className="text-2xl mt-8">{loading ? '—' : value}</div>
          </Card>
        ))}
      </div>

      {error ? <div className="alert error mb-16">{error}</div> : null}

      <Card padding="none" title={undefined}>
        {loading ? (
          <div className="card-pad">
            <Skeleton height={220} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="+"
            title="Пока нет олимпиад"
            description="Создайте первую олимпиаду и добавьте задания."
            action={<Button onClick={() => setOpen(true)}>Создать</Button>}
          />
        ) : (
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Статус</th>
                  <th>Задания</th>
                  <th>Участники</th>
                  <th>Старт</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="fw-600">{o.title}</div>
                      <div className="text-xs muted">{o.description || '—'}</div>
                    </td>
                    <td>
                      <StatusPill status={o.status} />
                    </td>
                    <td>{o.tasksCount}</td>
                    <td>{o.participantsCount}</td>
                    <td className="text-sm">{formatDate(o.startsAt)}</td>
                    <td>
                      <div className="row wrap">
                        <Link to={`/dev/olympiads/${o.id}/constructor`}>
                          <Button size="sm" variant="secondary">
                            Конструктор
                          </Button>
                        </Link>
                        <Link to={`/dev/olympiads/${o.id}/lifecycle`}>
                          <Button size="sm" variant="ghost">
                            Статус
                          </Button>
                        </Link>
                        <Link to={`/dev/olympiads/${o.id}/results`}>
                          <Button size="sm" variant="ghost">
                            Итоги
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новая олимпиада"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={onCreate} disabled={busy || !form.title.trim()}>
              {busy ? 'Создание…' : 'Создать'}
            </Button>
          </>
        }
      >
        <form className="stack" onSubmit={onCreate}>
          <Input
            label="Название"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <Input
            label="Описание"
            as="textarea"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Начало"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
          />
          <Input
            label="Окончание"
            type="datetime-local"
            value={form.endsAt || formatDateTimeLocal(null)}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
          />
        </form>
      </Modal>
    </AppShell>
  );
}
