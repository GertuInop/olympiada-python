const LABELS = {
  DRAFT: 'Черновик',
  OPEN: 'Открыта',
  LIVE: 'Идёт',
  CLOSED: 'Завершена',
  PUBLISHED: 'Опубликована',
  ACTIVE: 'Активен',
  BLOCKED: 'Заблокирован',
  ACCEPTED: 'Принято',
  WRONG: 'Неверно',
  ERROR: 'Ошибка',
  NONE: 'Нет',
  REGISTERED: 'Записан',
  JOINED: 'Участвует',
  COMPLETED: 'Завершил',
};

export default function StatusPill({ status, label }) {
  const text = label || LABELS[status] || status;
  return <span className={`status-pill status-${status}`}>{text}</span>;
}

export { LABELS as STATUS_LABELS };
