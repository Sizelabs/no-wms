"use client";

import type { Role } from "@no-wms/shared/constants/roles";
import { WR_STATUS_LABELS, type WrStatus } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface StatCardProps {
  label: string;
  value: string | number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{String(value)}</p>
    </div>
  );
}

interface RecentWr {
  id: string;
  wr_number: string;
  status: string;
  created_at: string;
  agencies: { name: string } | null;
  packages: { tracking_number: string }[];
}

interface DashboardStats {
  boxesReceivedToday: number;
  totalInWarehouse: number;
  pendingWorkOrders: number;
  pendingDispatches: number;
  openTickets: number;
  storageAlerts: number;
  recentWrs: RecentWr[];
}

interface DashboardGridProps {
  role: Role;
  stats: DashboardStats;
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

export function DashboardGrid({ role, stats }: DashboardGridProps) {
  const t = useTranslations("dashboard");

  const showRecentWrs = ["forwarder_admin", "warehouse_admin", "warehouse_operator"].includes(role);
  const showTickets = role !== "super_admin";
  const showDispatches = ["forwarder_admin", "warehouse_admin", "warehouse_operator", "shipping_clerk", "agency"].includes(role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        {t("welcome")}
      </h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("boxesReceivedToday")} value={stats.boxesReceivedToday} />
        <StatCard label={t("totalInWarehouse")} value={stats.totalInWarehouse} />
        <StatCard label={t("pendingWorkOrders")} value={stats.pendingWorkOrders} />
        <StatCard label={t("storageAlerts")} value={stats.storageAlerts} />
      </div>

      {/* Widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Recent WRs */}
        {showRecentWrs && (
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Recibos recientes</h3>
              <Link href="/warehouse-receipts" className="text-xs text-blue-600 hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recentWrs.map((wr) => (
                <div key={wr.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{wr.wr_number}</span>
                    <span className="text-gray-500">{wr.agencies?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">
                      {WR_STATUS_LABELS[wr.status as WrStatus] ?? wr.status}
                    </span>
                    <span className="text-gray-400">{timeAgo(wr.created_at)}</span>
                  </div>
                </div>
              ))}
              {!stats.recentWrs.length && (
                <p className="py-2 text-center text-xs text-gray-400">Sin recibos recientes</p>
              )}
            </div>
          </div>
        )}

        {/* Open tickets */}
        {showTickets && (
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Tickets abiertos</h3>
              <Link href="/tickets" className="text-xs text-blue-600 hover:underline">
                Ver todos
              </Link>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.openTickets}</p>
            <p className="mt-1 text-xs text-gray-500">tickets requieren atención</p>
          </div>
        )}

        {/* Pending dispatches */}
        {showDispatches && (
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">{t("pendingDispatches")}</h3>
              <Link href="/shipping-instructions" className="text-xs text-blue-600 hover:underline">
                Ver todos
              </Link>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingDispatches}</p>
            <p className="mt-1 text-xs text-gray-500">embarques pendientes</p>
          </div>
        )}
      </div>
    </div>
  );
}
