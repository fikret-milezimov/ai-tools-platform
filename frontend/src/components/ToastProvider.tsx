"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  success:
    "border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-md",
  error: "border border-red-200 bg-red-50 text-red-900 shadow-md",
  info: "border border-slate-200 bg-white text-slate-900 shadow-md",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const regionId = useId();

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      const duration = variant === "error" ? 6000 : 4000;
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        id={regionId}
        className="pointer-events-none fixed bottom-0 right-0 z-[100] flex max-w-md flex-col gap-2 p-4 sm:p-6"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium ${variantStyles[t.variant]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/** Read and clear a one-shot toast set before navigation (e.g. sessionStorage). */
export function consumeStoredToast(
  showToast: (m: string, v?: ToastVariant) => void,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem("toast_flash");
    if (!raw) return;
    sessionStorage.removeItem("toast_flash");
    const parsed = JSON.parse(raw) as {
      message?: string;
      variant?: ToastVariant;
    };
    if (typeof parsed.message === "string") {
      showToast(parsed.message, parsed.variant ?? "success");
    }
  } catch {
    sessionStorage.removeItem("toast_flash");
  }
}

export function flashToast(message: string, variant: ToastVariant = "success") {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    "toast_flash",
    JSON.stringify({ message, variant }),
  );
}
