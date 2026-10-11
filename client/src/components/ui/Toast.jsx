import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Button from './Button';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = ++toastId;
      const item = {
        id,
        title: toast.title || '',
        message: toast.message || '',
        tone: toast.tone || 'info',
      };
      setToasts((prev) => [...prev, item]);
      window.setTimeout(() => dismiss(id), toast.duration ?? 3200);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      push,
      success: (message, title = 'Успешно') => push({ tone: 'success', title, message }),
      error: (message, title = 'Ошибка') => push({ tone: 'error', title, message }),
      info: (message, title = 'Сообщение') => push({ tone: 'info', title, message }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <div>
              {t.title ? <div className="toast-title">{t.title}</div> : null}
              {t.message ? <div className="toast-msg">{t.message}</div> : null}
            </div>
            <Button variant="ghost" size="sm" onClick={() => dismiss(t.id)}>
              ✕
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
