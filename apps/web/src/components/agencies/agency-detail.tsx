"use client";

import type { Role } from "@no-wms/shared/constants/roles";
import { RATE_UNIT_LABELS, type RateUnit } from "@no-wms/shared/constants/tariff";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { UserList } from "@/components/users/user-list";

interface Consignee {
  id: string;
  full_name: string;
  casillero: string;
  cedula_ruc: string | null;
  city: string | null;
  is_active: boolean;
}

interface AgencyUser {
  id: string;
  full_name: string;
  is_active: boolean;
  user_roles: { id: string; role: string }[];
}

interface TariffSchedule {
  id: string;
  rate: number;
  rate_unit: string;
  minimum_charge: number | null;
  is_active: boolean;
  effective_from: string;
  warehouses: { name: string } | null;
  handling_costs: { name: string } | null;
  destinations: { city: string; country_code: string } | null;
}

interface AgencyDetailProps {
  agencyId: string;
  consignees: Consignee[];
  users: AgencyUser[];
  tariffs: TariffSchedule[];
  children: React.ReactNode; // original agency info content
}

type Tab = "info" | "consignees" | "tariffs" | "users";

const USER_TAB_ROLES: Role[] = ["super_admin", "forwarder_admin", "destination_admin"];

export function AgencyDetail({ agencyId, consignees, users, tariffs, children }: AgencyDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const { locale } = useParams<{ locale: string }>();
  const userRoles = useUserRoles();

  const showUsersTab = userRoles.some((r) => USER_TAB_ROLES.includes(r));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "info", label: "Información" },
    { key: "consignees", label: "Consignatarios", count: consignees.length },
    { key: "tariffs", label: "Tarifas", count: tariffs.length },
    ...(showUsersTab ? [{ key: "users" as const, label: "Usuarios", count: users.length }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <div className="-mb-px flex items-end justify-between">
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
          {activeTab === "consignees" && (
            <Link
              href={`/${locale}/consignees/new?agency_id=${agencyId}`}
              className="mb-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Nuevo Consignatario
            </Link>
          )}
          {activeTab === "users" && showUsersTab && (
            <Link
              href={`/${locale}/agencies/${agencyId}/users/new`}
              className="mb-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Invitar Usuario
            </Link>
          )}
        </div>
      </div>

      {activeTab === "info" && children}

      {activeTab === "consignees" && (
        <div className="rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Casillero</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Cédula/RUC</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {consignees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Sin consignatarios registrados.
                  </td>
                </tr>
              ) : (
                consignees.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{c.casillero}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        href={`/${locale}/consignees/${c.id}`}
                        className="hover:underline"
                      >
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.cedula_ruc ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{c.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {c.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "tariffs" && (
        <div className="rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Costo de Manejo</th>
                <th className="px-4 py-3">Bodega</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Tarifa</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tariffs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Sin tarifas configuradas para esta agencia.
                  </td>
                </tr>
              ) : (
                tariffs.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-medium">{t.handling_costs?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{t.warehouses?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {t.destinations ? `${t.destinations.city} (${t.destinations.country_code})` : "Todos"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">
                      ${Number(t.rate).toFixed(2)} {RATE_UNIT_LABELS[t.rate_unit as RateUnit] ?? t.rate_unit}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        {t.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/tariffs/${t.id}`}
                        className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "users" && (
        <UserList users={users} allowedRoles={USER_TAB_ROLES} />
      )}
    </div>
  );
}
