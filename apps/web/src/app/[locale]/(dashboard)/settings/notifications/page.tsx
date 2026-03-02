import { PageHeader } from "@/components/layout/page-header";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Preferencias de Notificación" />
      <NotificationPreferences />
    </div>
  );
}
