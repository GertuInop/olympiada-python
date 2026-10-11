const TOKEN_KEY = 'olymp_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || 'Некорректный ответ сервера' };
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Ошибка ${res.status}`, res.status, data);
  }

  return data;
}

export const authApi = {
  login: (body) => api('/auth/login', { method: 'POST', body }),
  register: (body) => api('/auth/register', { method: 'POST', body }),
  me: () => api('/auth/me'),
};

export const olympiadsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.mine) q.set('mine', '1');
    const qs = q.toString();
    return api(`/olympiads${qs ? `?${qs}` : ''}`);
  },
  get: (id) => api(`/olympiads/${id}`),
  create: (body) => api('/olympiads', { method: 'POST', body }),
  update: (id, body) => api(`/olympiads/${id}`, { method: 'PATCH', body }),
  register: (id) => api(`/olympiads/${id}/register`, { method: 'POST' }),
  join: (id) => api(`/olympiads/${id}/join`, { method: 'POST' }),
  complete: (id) => api(`/olympiads/${id}/complete`, { method: 'POST' }),
  results: (id) => api(`/olympiads/${id}/results`),
  publish: (id) => api(`/olympiads/${id}/publish`, { method: 'POST' }),
  certificate: (id) => api(`/olympiads/${id}/certificate`, { method: 'POST' }),
};

export const tasksApi = {
  create: (body) => api('/tasks', { method: 'POST', body }),
  update: (id, body) => api(`/tasks/${id}`, { method: 'PATCH', body }),
  remove: (id) => api(`/tasks/${id}`, { method: 'DELETE' }),
  checkReference: (id) => api(`/tasks/${id}/check-reference`, { method: 'POST' }),
};

export const submissionsApi = {
  create: (body) => api('/submissions', { method: 'POST', body }),
  run: (body) => api('/submissions/run', { method: 'POST', body }),
  mine: (olympiadId) =>
    api(`/submissions/mine${olympiadId ? `?olympiadId=${olympiadId}` : ''}`),
};

export const adminApi = {
  dashboard: () => api('/admin/dashboard'),
  users: () => api('/admin/users'),
  updateUser: (id, body) => api(`/admin/users/${id}`, { method: 'PATCH', body }),
  results: () => api('/admin/results'),
};
