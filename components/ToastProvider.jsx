// components/ToastProvider.jsx
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastCtx = createContext(null);

let idSeq = 0;
function mkId() {
  idSeq += 1;
  return `t${idSeq}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (opts) => {
      const id = mkId();
      const toast = { id, variant: "info", duration: 3200, ...opts };
      setToasts((arr) => [toast, ...arr]); // newest on top
      if (toast.duration > 0) {
        const h = setTimeout(() => remove(id), toast.duration);
        timers.current.set(id, h);
      }
      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      show: (message, config = {}) => push({ message, ...config }),
      success: (message, config = {}) => push({ message, variant: "success", ...config }),
      error: (message, config = {}) => push({ message, variant: "error", ...config }),
      info: (message, config = {}) => push({ message, variant: "info", ...config }),
      dismiss: remove,
    }),
    [push, remove]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="pp-toasts" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={`pp-toast ${t.variant}`}>
            <div className="msg">{t.message}</div>
            <button className="x" aria-label="Dismiss notification" onClick={() => remove(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        /* Brand tokens (mirrors Header) */
        :root {
          --storm-blue: #141b4d;
          --caribbean-sea: #279989;
          --caribbean-sea-dark: #1e7a6f;
          --highlight-coral: #e86a5e;
          --highlight-coral-dark: #b94c42;
          --light-teal-tint: #ecf6f4;
          --cloud: #e9e9e9;
          --char: #3a3a3a;
        }

        .pp-toasts {
          position: fixed;
          z-index: 1000;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column-reverse;
          align-items: center;
          gap: 12px;
          pointer-events: none; /* clicks pass through except on buttons */
        }

        .pp-toast {
          pointer-events: auto;
          min-width: 360px;
          max-width: 90vw;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
          animation: slideIn 200ms ease-out;
        }

        /* Variant backgrounds + left-accent border */
        .pp-toast.success {
          background: var(--caribbean-sea);
          border-left: 6px solid var(--caribbean-sea-dark);
        }
        .pp-toast.error {
          background: var(--highlight-coral);
          border-left: 6px solid var(--highlight-coral-dark);
        }
        .pp-toast.info {
          background: var(--storm-blue);
          border-left: 6px solid #0d1238; /* darker storm */
        }

        .pp-toast .msg {
          line-height: 1.35;
        }

        .pp-toast .x {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          opacity: 0.9;
          color: #fff;
        }
        .pp-toast .x:hover {
          opacity: 1;
        }
        .pp-toast .x:focus-visible {
          outline: none;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.35);
          border-radius: 6px;
        }

        @keyframes slideIn {
   from {
     transform: translateY(8px);
     opacity: 0;
   }
   to {
     transform: translateY(0);
     opacity: 1;
   }
 }

        @media (max-width: 480px) {
          .pp-toasts {
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
            padding: 0 10px;
          }
          .pp-toast {
            min-width: auto;
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pp-toast {
            animation: none;
          }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  // SSR-safe: return no-ops on the server, and also if provider isn't mounted yet on client
  if (typeof window === "undefined") {
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    };
  }
  const ctx = useContext(ToastCtx);
  return (
    ctx || {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    }
  );
}
