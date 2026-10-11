import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Progress,
  Skeleton,
  StatusPill,
  Tabs,
  useToast,
} from '../components/ui';

export default function UiKitPage() {
  const toast = useToast();
  const [tab, setTab] = useState('a');
  const [open, setOpen] = useState(false);

  return (
    <AppShell title="UI Kit" meta="Библиотека компонентов">
      <PageHeader
        title="UI Kit"
        description="Демонстрация базовых компонентов дизайн-системы."
      />

      <div className="stack-lg">
        <Card title="Кнопки">
          <div className="row wrap">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        <Card title="Поля ввода">
          <div className="grid-12">
            <div className="col-4">
              <Input label="Email" placeholder="name@olymp.local" />
            </div>
            <div className="col-4">
              <Input label="С ошибкой" error="Обязательное поле" />
            </div>
            <div className="col-4">
              <Input label="Роль" as="select" defaultValue="PARTICIPANT">
                <option value="PARTICIPANT">Участник</option>
                <option value="DEVELOPER">Разработчик</option>
              </Input>
            </div>
          </div>
        </Card>

        <Card title="Бейджи и статусы">
          <div className="row wrap">
            <Badge tone="primary">Primary</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
            <StatusPill status="DRAFT" />
            <StatusPill status="OPEN" />
            <StatusPill status="LIVE" />
            <StatusPill status="CLOSED" />
            <StatusPill status="PUBLISHED" />
          </div>
        </Card>

        <Card title="Вкладки, прогресс, скелетоны">
          <Tabs
            tabs={[
              { value: 'a', label: 'Вкладка A' },
              { value: 'b', label: 'Вкладка B' },
              { value: 'c', label: 'Вкладка C' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="mt-16" style={{ maxWidth: 360 }}>
            <Progress value={62} label="Прогресс" />
          </div>
          <div className="row mt-16" style={{ gap: 12 }}>
            <Skeleton width={120} height={20} />
            <Skeleton width={80} height={20} />
            <Skeleton width={200} height={20} />
          </div>
        </Card>

        <Card title="Тосты и модалка">
          <div className="row wrap">
            <Button onClick={() => toast.success('Операция выполнена')}>Success toast</Button>
            <Button variant="danger" onClick={() => toast.error('Что-то пошло не так')}>
              Error toast
            </Button>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              Открыть модалку
            </Button>
          </div>
        </Card>

        <Card>
          <EmptyState
            icon="◇"
            title="Пустое состояние"
            description="Используйте EmptyState для нулевых списков."
            action={<Button size="sm">Действие</Button>}
          />
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Пример модального окна"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
            <Button onClick={() => setOpen(false)}>Ок</Button>
          </>
        }
      >
        <p className="secondary">
          Модалка с затемнением фона, Escape для закрытия и слотом футера.
        </p>
      </Modal>
    </AppShell>
  );
}
