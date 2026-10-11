import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { olympiadsApi } from '../../api/client';
import AppShell from '../../components/layout/AppShell';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusPill,
  useToast,
} from '../../components/ui';
import { formatDate } from '../../utils/format';

const FLOW = [
  { status: 'DRAFT', label: 'Черновик', hint: 'Редактирование заданий' },
  { status: 'OPEN', label: 'Открыта', hint: 'Регистрация участников' },
  { status: 'LIVE', label: 'Идёт', hint: 'Приём решений' },
  { status: 'CLOSED', label: 'Завершена', hint: 'Проверка и подготовка итогов' },
  { status: 'PUBLISHED', label: 'Опубликована', hint: 'Результаты и сертификаты' },
];

export default function LifecyclePage() {
  const { id } = useParams();
  const toast = useToast();
  const [olympiad, setOlympiad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await olympiadsApi.get(id);
      setOlympiad(data.olympiad);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function setStatus(status) {
    setBusy(true);
    try {
      const data = await olympiadsApi.update(id, { status });
      setOlympiad((prev) => ({ ...prev, ...data.olympiad }));
      toast.success(`Статус: ${status}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Жизненный цикл">
        <Skeleton height={280} />
      </AppShell>
    );
  }

  if (error || !olympiad) {
    return (
      <AppShell title="Жизненный цикл">
        <Card>
          <EmptyState title="Ошибка" description={error} />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Жизненный цикл" meta={olympiad.title}>
      <PageHeader
        title="Управление статусом"
        description={olympiad.title}
        actions={
          <>
            <StatusPill status={olympiad.status} />
            <Link to={`/dev/olympiads/${id}/constructor`}>
              <Button variant="secondary">Конструктор</Button>
            </Link>
          </>
        }
      />

      <div className="kpi-grid mb-16">
        <Card>
          <div className="text-sm muted">Задания</div>
          <div className="text-2xl mt-8">{olympiad.tasksCount}</div>
        </Card>
        <Card>
          <div className="text-sm muted">Участники</div>
          <div className="text-2xl mt-8">{olympiad.participantsCount}</div>
        </Card>
        <Card>
          <div className="text-sm muted">Старт</div>
          <div className="text-sm fw-600 mt-8">{formatDate(olympiad.startsAt)}</div>
        </Card>
        <Card>
          <div className="text-sm muted">Финиш</div>
          <div className="text-sm fw-600 mt-8">{formatDate(olympiad.endsAt)}</div>
        </Card>
      </div>

      <Card title="Переходы статуса" className="stack">
        {FLOW.map((step) => {
          const active = olympiad.status === step.status;
          return (
            <div
              key={step.status}
              className="row-between wrap"
              style={{
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: active ? 'var(--color-primary-soft)' : 'transparent',
              }}
            >
              <div>
                <div className="row gap-8">
                  <StatusPill status={step.status} />
                  {active ? <span className="text-xs fw-600" style={{ color: 'var(--color-primary)' }}>текущий</span> : null}
                </div>
                <div className="text-sm muted mt-8">{step.hint}</div>
              </div>
              <Button
                size="sm"
                variant={active ? 'secondary' : 'primary'}
                disabled={busy || active}
                onClick={() => setStatus(step.status)}
              >
                Установить
              </Button>
            </div>
          );
        })}
      </Card>

      <Card className="mt-16" title="Участники онлайн">
        {(olympiad.registrations || []).length === 0 ? (
          <EmptyState title="Нет регистраций" />
        ) : (
          <div className="stack-sm">
            {olympiad.registrations.map((r) => (
              <div key={r.id} className="row-between text-sm">
                <span>{r.user?.name || r.user?.email}</span>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
