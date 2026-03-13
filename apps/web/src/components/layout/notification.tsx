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
  message: ReactNode;
  type: NotificationType;
}

interface NotificationContextValue {
  notify: (message: ReactNode, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return ctx;
}

const DURATION = 8000;
const EXIT_MS = 200;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [phase, setPhase] = useState<"in" | "out" | null>(null);
  const [key, setKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (exitRef.current) clearTimeout(exitRef.current);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("out");
    exitRef.current = setTimeout(() => {
      setNotification(null);
      setPhase(null);
    }, EXIT_MS);
  }, []);

  const startAutoClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, DURATION);
  }, [dismiss]);

  const pauseAutoClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const notify = useCallback(
    (message: ReactNode, type: NotificationType) => {
      clearTimers();
      setNotification({ message, type });
      setPhase("in");
      setKey((k) => k + 1);
      timerRef.current = setTimeout(dismiss, DURATION);
    },
    [clearTimers, dismiss],
  );

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {notification && phase && (
        <div
          key={key}
          role="alert"
          onMouseEnter={pauseAutoClose}
          onMouseLeave={startAutoClose}
          className={`fixed bottom-6 left-1/2 z-50 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${
            notification.type === "success"
              ? "border-gray-200 bg-white text-gray-800"
              : "border-red-200 bg-white text-red-700"
          } ${phase === "in" ? "animate-toast-in" : "animate-toast-out"}`}
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
      )}
    </NotificationContext.Provider>
  );
}
