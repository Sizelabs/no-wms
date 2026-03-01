"use client";

import type { Role } from "@no-wms/shared/constants/roles";
import { useTranslations } from "next-intl";

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

interface WidgetProps {
  title: string;
}

function WidgetPlaceholder({ title }: WidgetProps) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <div className="mt-3 flex h-32 items-center justify-center rounded-md bg-gray-50 text-sm text-gray-400">
        Próximamente
      </div>
    </div>
  );
}

const DASHBOARD_WIDGETS: Record<Role, string[]> = {
  super_admin: [
    "agencies",
    "boxesReceivedToday",
    "totalInWarehouse",
    "pendingWorkOrders",
    "storageAlerts",
    "pendingDispatches",
  ],
  warehouse_admin: [
    "agencies",
    "boxesReceivedToday",
    "totalInWarehouse",
    "pendingWorkOrders",
    "storageAlerts",
    "pendingDispatches",
  ],
  warehouse_operator: [
    "boxesReceivedToday",
    "totalInWarehouse",
    "pendingWorkOrders",
    "pendingDispatches",
  ],
  shipping_clerk: [
    "pendingDispatches",
    "totalInWarehouse",
    "pendingWorkOrders",
  ],
  destination_admin: [
    "agencies",
    "totalInWarehouse",
    "pendingWorkOrders",
    "storageAlerts",
  ],
  destination_operator: [
    "agencies",
    "totalInWarehouse",
    "pendingWorkOrders",
  ],
  agency: [
    "totalInWarehouse",
    "pendingWorkOrders",
    "pendingDispatches",
  ],
};

interface DashboardGridProps {
  role: Role;
}

export function DashboardGrid({ role }: DashboardGridProps) {
  const t = useTranslations("dashboard");

  const widgets = DASHBOARD_WIDGETS[role];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        {t("welcome")}
      </h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("boxesReceivedToday")} value="—" />
        <StatCard label={t("totalInWarehouse")} value="—" />
        <StatCard label={t("pendingWorkOrders")} value="—" />
        <StatCard label={t("storageAlerts")} value="—" />
      </div>

      {/* Role-specific widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.map((key) => (
          <WidgetPlaceholder key={key} title={t(key)} />
        ))}
      </div>
    </div>
  );
}
