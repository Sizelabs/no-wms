"use client";

import { NOTIFICATION_EVENT_TYPES } from "@no-wms/shared/constants/statuses";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { getNotificationPreferences, updateNotificationPreference } from "@/lib/actions/notifications";

const EVENT_TYPE_LABELS: Record<string, string> = {
  wr_received: "Paquete recibido",
  wr_dispatched: "Paquete despachado",
  wo_completed: "Orden de trabajo completada",
  invoice_sent: "Factura enviada",
  ticket_created: "Ticket creado",
  ticket_status_changed: "Estado de ticket cambiado",
  ticket_message: "Mensaje en ticket",
  mass_announcement: "Anuncios masivos",
};

interface Preference {
  event_type: string;
  channel: string;
  is_enabled: boolean;
}

export function NotificationPreferences() {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [prefs, setPrefs] = useState<Preference[]>([]);

  useEffect(() => {
    getNotificationPreferences().then(({ data }) => {
      setPrefs(data as Preference[]);
    });
  }, []);

  const isEnabled = (eventType: string, channel: string): boolean => {
    const pref = prefs.find((p) => p.event_type === eventType && p.channel === channel);
    return pref?.is_enabled !== false; // default enabled
  };

  const handleToggle = (eventType: string, channel: string) => {
    const current = isEnabled(eventType, channel);
    const newValue = !current;

    // Optimistic update
    setPrefs((prev) => {
      const existing = prev.find((p) => p.event_type === eventType && p.channel === channel);
      if (existing) {
        return prev.map((p) =>
          p.event_type === eventType && p.channel === channel
            ? { ...p, is_enabled: newValue }
            : p,
        );
      }
      return [...prev, { event_type: eventType, channel, is_enabled: newValue }];
    });

    startTransition(async () => {
      const result = await updateNotificationPreference(eventType, channel, newValue);
      if ("error" in result) {
        notify(result.error, "error");
        // Revert
        setPrefs((prev) =>
          prev.map((p) =>
            p.event_type === eventType && p.channel === channel
              ? { ...p, is_enabled: current }
              : p,
          ),
        );
      }
    });
  };

  const eventTypes = Object.values(NOTIFICATION_EVENT_TYPES);

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Preferencias de Notificación</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2">Evento</th>
              <th className="px-4 py-2 text-center">Email</th>
              <th className="px-4 py-2 text-center">En App</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {eventTypes.map((et) => (
              <tr key={et}>
                <td className="px-4 py-3 text-xs text-gray-700">
                  {EVENT_TYPE_LABELS[et] ?? et}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(et, "email")}
                    disabled={isPending}
                    className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      isEnabled(et, "email") ? "bg-gray-900" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        isEnabled(et, "email") ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(et, "in_app")}
                    disabled={isPending}
                    className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      isEnabled(et, "in_app") ? "bg-gray-900" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        isEnabled(et, "in_app") ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
