"use client";

import Link from "next/link";

interface Notification {
  id: string;
  event_type: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationPanelProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAllRead: () => void;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationPanel({ notifications, loading, onMarkAllRead, onClose }: NotificationPanelProps) {
  return (
    <div className="rounded-lg border bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
        <button
          onClick={onMarkAllRead}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Marcar todo leído
        </button>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {loading && (
          <div className="px-4 py-6 text-center text-xs text-gray-400">Cargando...</div>
        )}
        {!loading && !notifications.length && (
          <div className="px-4 py-6 text-center text-xs text-gray-400">
            No hay notificaciones
          </div>
        )}
        {!loading &&
          notifications.map((n) => (
            <div
              key={n.id}
              className={`border-b px-4 py-3 last:border-b-0 ${n.read_at ? "bg-white" : "bg-blue-50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-900">{n.subject}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>
                </div>
                <span className="shrink-0 text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
              </div>
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-2">
        <Link
          href="/settings/notifications"
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Preferencias de notificación
        </Link>
      </div>
    </div>
  );
}
