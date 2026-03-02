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
      {children}
      {notification && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div
            role="alert"
            className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${
              notification.type === "success"
                ? "border-gray-200 bg-white text-gray-800"
                : "border-red-200 bg-white text-red-700"
            }`}
          >
            <span
              className={`size-2 shrink-0 rounded-full ${
                notification.type === "success" ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="whitespace-nowrap">{notification.message}</span>
            <button
              type="button"
              onClick={dismiss}
              className="ml-1 shrink-0 text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
