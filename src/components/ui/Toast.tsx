"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { X, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
}

interface ToastContextType {
  toast: (
    type: ToastType,
    title: string,
    message?: string,
    duration?: number,
  ) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-[var(--accent-success)]" />,
  error: <XCircle className="w-5 h-5 text-[var(--accent-danger)]" />,
  warning: <AlertTriangle className="w-5 h-5 text-[var(--accent-warning)]" />,
  info: <Info className="w-5 h-5 text-[var(--accent-info)]" />,
};

const borderColors: Record<ToastType, string> = {
  success: "border-l-[var(--accent-success)]",
  error: "border-l-[var(--accent-danger)]",
  warning: "border-l-[var(--accent-warning)]",
  info: "border-l-[var(--accent-info)]",
};

const ToastContext = createContext<ToastContextType | null>(null);

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }, [toast.id, onRemove]);

  // Auto-dismiss
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(handleRemove, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleRemove]);

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`
        pointer-events-auto
        flex items-start gap-3
        w-[380px] p-4
        bg-[var(--surface-raised)] shadow-[var(--v2-shadow-md)]
        rounded-[var(--v2-radius-md)]
        border border-[var(--border-default)]
        border-l-[3px] ${borderColors[toast.type]}
        transition-all duration-200 ease-out
        ${isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--text-primary)]">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={handleRemove}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors duration-[180ms]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 5000) => {
      const id = Math.random().toString(36).substring(2, 11);
      setToasts((prev) => [
        ...prev,
        { id, type, title, message, duration, createdAt: Date.now() },
      ]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue: ToastContextType = {
    toast: addToast,
    success: (title, message) => addToast("success", title, message),
    error: (title, message) => addToast("error", title, message),
    warning: (title, message) => addToast("warning", title, message),
    info: (title, message) => addToast("info", title, message),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container — top-right, 16px from edges */}
      <div
        className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
