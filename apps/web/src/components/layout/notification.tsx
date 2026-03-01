"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type NotificationType = "success" | "error";

interface Notification {
  message: string;
  type: NotificationType;
}

interface NotificationContextValue {
  notify: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setNotification(null);
  }, []);

  const notify = useCallback(
    (message: string, type: NotificationType) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setNotification({ message, type });
      timerRef.current = setTimeout(dismiss, 5000);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {notification && (
        <div className="px-6 pt-4">
          <div
            role="alert"
            className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm ${
              notification.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={dismiss}
              className="ml-4 shrink-0 text-current opacity-60 hover:opacity-100"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {children}
    </NotificationContext.Provider>
  );
}
