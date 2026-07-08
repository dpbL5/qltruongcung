"use client";

// ── Toast notification system ───────────────────────────
// Dùng cho feedback sau actions (create, update, delete, error)

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle, AlertCircle, X, XCircle } from "lucide-react";

// ── Types ──────────────────────────────────────────────
type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

// ── Context ────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

// ── Provider ───────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-dismiss after 3.5s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3500);
  }, []);

  const success = useCallback((msg: string) => addToast("success", msg), [addToast]);
  const error = useCallback((msg: string) => addToast("error", msg), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => {
            setToasts((prev) => prev.map((x) => (x.id === t.id ? { ...x, exiting: true } : x)));
            setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 300);
          }} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Toast Item ─────────────────────────────────────────
const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
  warning: AlertCircle,
};

const colorMap: Record<ToastType, string> = {
  success: "border-green-400/40 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white",
  error: "border-red-400/40 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white",
  info: "border-blue-400/40 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white",
  warning: "border-yellow-400/40 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white",
};

const iconColorMap: Record<ToastType, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = iconMap[t.type];

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm min-w-[280px] max-w-[380px] transition-all duration-300 ${
        t.exiting ? "opacity-0 translate-x-4 scale-95" : "opacity-100 animate-slide-up"
      } ${colorMap[t.type]}`}
    >
      <Icon size={18} className={`shrink-0 ${iconColorMap[t.type]}`} />
      <p className="flex-1 text-sm font-medium">{t.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
