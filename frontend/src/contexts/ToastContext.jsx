import { createContext, useState, useCallback } from 'react';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4500 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, title, message, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (message, title = 'Thành công') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Lỗi hệ thống') => addToast({ type: 'error', title, message }),
    warning: (message, title = 'Cảnh báo') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Thông báo') => addToast({ type: 'info', title, message }),
    remove: removeToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts.length) return null;

  return (
    <div className="toast-portal">
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onRemove={() => onRemove(item.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ item, onRemove }) => {
  const { type, title, message, duration } = item;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="toast__icon toast__icon--success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="toast__icon toast__icon--error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="toast__icon toast__icon--warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="toast__icon toast__icon--info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`toast-card toast-card--${type}`}>
      <div className="toast-card__left">{getIcon()}</div>
      <div className="toast-card__content">
        {title && <h4 className="toast-card__title">{title}</h4>}
        <p className="toast-card__message">{message}</p>
      </div>
      <button className="toast-card__close" onClick={onRemove} type="button" aria-label="Close">
        &times;
      </button>
      {duration > 0 && (
        <div
          className="toast-card__progress"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
};
