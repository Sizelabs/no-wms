"use client";

import { useEffect, useState, useTransition } from "react";

import { NotificationPanel } from "@/components/notifications/notification-panel";
import { getNotifications, getUnreadCount, markAllAsRead } from "@/lib/actions/notifications";

interface Notification {
  id: string;
  event_type: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getUnreadCount().then(setUnread);
  }, []);

  const handleOpen = () => {
    if (!isOpen) {
      startTransition(async () => {
        const { data } = await getNotifications(20);
        setNotifications(data as Notification[]);
      });
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAsRead();
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Notificaciones"
      >
        {/* Bell icon (SVG) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          {/* Panel */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80">
            <NotificationPanel
              notifications={notifications}
              loading={isPending}
              onMarkAllRead={handleMarkAllRead}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
