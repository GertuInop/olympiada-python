export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function countdownParts(target) {
  if (!target) return null;
  const end = new Date(target).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return { total: 0, h: 0, m: 0, s: 0, finished: true };
  const total = Math.floor(diff / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { total, h, m, s, finished: false };
}

export function formatCountdown(parts) {
  if (!parts) return '—';
  if (parts.finished) return '00:00:00';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(parts.h)}:${pad(parts.m)}:${pad(parts.s)}`;
}

export function roleLabel(role) {
  return (
    {
      PARTICIPANT: 'Участник',
      DEVELOPER: 'Разработчик',
      ADMIN: 'Администратор',
    }[role] || role
  );
}
