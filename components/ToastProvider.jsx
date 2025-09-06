// components/ToastProvider.jsx
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastCtx = createContext(null);

let idSeq = 0;
function mkId() { idSeq += 1; return `t${idSeq}`; }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const push = useCallback((opts) => {
    const id = mkId();
    const toast = { id, variant: "info", duration: 3200, ...opts };
    setToasts((arr) => [toast, ...arr]); // newest on top
    if (toast.duration > 0) {
      const h = setTimeout(() => remove(id), toast.duration);
      timers.current.set(id, h);
    }
    return id;
  }, [remove]);

  const api = useMemo(() => ({
    show: (message, config={}) => push({ message, ...config }),
    success: (message, config={}) => push({ message, variant: "success", ...config }),
    error: (message, config={}) => push({ message, variant: "error", ...config }),
    info: (message, config={}) => push({ message, variant: "info", ...config }),
    dismiss: remove,
  }), [push, remove]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Live region for screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pp-toasts"
        role="status"
      >
        {toasts.map((t) => (
          <div key={t.id} className={`pp-toast ${t.variant}`}>
            <div className="msg">{t.message}</div>
            <button
              className="x"
              aria-label="Dismiss notification"
              onClick={() => remove(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        .pp-toasts {
          position: fixed;
          z-index: 1000;
          right: 14px;
          top: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none; /* clicks pass through except on buttons */
        }
        .pp-toast {
          pointer-events: auto;
          min-width: 240px;
          max-width: 420px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: start;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--cloud);
          background: #fff;
          box-shadow: 0 12px 28px rgba(0,0,0,0.12);
          animation: slideIn 160ms ease-out;
          font-size: 14px;
        }
        .pp-toast .msg { line-height: 1.35; color: var(--char); }
        .pp-toast .x {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          opacity: 0.7;
        }
        .pp-toast .x:hover { opacity: 1; }

        .pp-toast.success { border-color: rgba(39,153,137,0.35); box-shadow: 0 6px 20px rgba(39,153,137,0.18); }
        .pp-toast.error   { border-color: rgba(232,106,94,0.35); box-shadow: 0 6px 20px rgba(232,106,94,0.18); }
        .pp-toast.info    { border-color: rgba(20,27,77,0.25);  box-shadow: 0 6px 20px rgba(20,27,77,0.12); }

        @keyframes slideIn {
          from { transform: translateY(-8px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        @media (max-width: 480px) {
          .pp-toasts { left: 10px; right: 10px; }
          .pp-toast { max-width: none; }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
