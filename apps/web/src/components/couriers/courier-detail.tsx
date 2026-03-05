"use client";

import { MODALITY_LABELS } from "@no-wms/shared/constants/modalities";
import type { Role } from "@no-wms/shared/constants/roles";
import { TARIFF_SIDE_LABELS, type TariffSide } from "@no-wms/shared/constants/tariff";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { UserList } from "@/components/users/user-list";
import { deleteCourier } from "@/lib/actions/couriers";

interface CourierWarehouseDestination {
  id: string;
  destination_id: string;
  is_active: boolean;
  transit_days: number | null;
  destinations: { city: string; country_code: string } | null;
}

interface TariffSchedule {
  id: string;
  tariff_side: string;
  tariff_type: string;
  courier_id: string | null;
  agency_id: string | null;
  modality: string | null;
  base_fee: number;
  is_active: boolean;
  effective_from: string;
  agencies: { name: string; code: string } | null;
  destinations: { city: string; country_code: string } | null;
  shipping_categories: { code: string; name: string } | null;
  tariff_brackets: { id: string }[];
}

interface CourierWarehouse {
  id: string;
  warehouse_id: string;
  is_active: boolean;
  warehouses: { name: string } | null;
  courier_warehouse_destinations: CourierWarehouseDestination[];
}

interface Agency {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
}

interface Courier {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  type: string;
  ruc: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  courier_warehouses: CourierWarehouse[];
  agencies: Agency[];
}

interface CourierUser {
  id: string;
  full_name: string;
  is_active: boolean;
  user_roles: { id: string; role: string }[];
}

interface CourierDetailProps {
  courier: Courier;
  users: CourierUser[];
  tariffs: TariffSchedule[];
}

type Tab = "info" | "agencies" | "coverage" | "tariffs" | "users";

const USER_TAB_ROLES: Role[] = ["super_admin", "forwarder_admin", "destination_admin"];

export function CourierDetail({ courier, users, tariffs }: CourierDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const userRoles = useUserRoles();

  function handleDelete() {
    if (!confirm(`¿Eliminar permanentemente "${courier.name}"?\n\nSe eliminarán también todas sus agencias, roles de usuario y datos de cobertura asociados.\n\nEsta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteCourier(courier.id);
      if (result?.error) {
        notify(result.error, "error");
      } else {
        router.push(`/${locale}/couriers`);
      }
    });
  }

  const detailActions: DetailAction[] = [
    {
      label: "Editar",
      href: `/${locale}/couriers/${courier.id}/edit`,
      roles: ["super_admin", "forwarder_admin", "destination_admin"],
    },
    {
      label: "Eliminar",
      variant: "danger",
      roles: ["super_admin", "forwarder_admin"],
      onClick: handleDelete,
    },
  ];

  const totalDestinations = courier.courier_warehouses.reduce(
    (sum, cw) => sum + (cw.courier_warehouse_destinations?.length ?? 0),
    0,
  );

  const showUsersTab = userRoles.some((r) => USER_TAB_ROLES.includes(r));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "info", label: "Información" },
    { key: "agencies", label: "Agencias", count: courier.agencies?.length ?? 0 },
    { key: "coverage", label: "Cobertura", count: totalDestinations },
    { key: "tariffs", label: "Tarifas", count: tariffs.length },
    ...(showUsersTab ? [{ key: "users" as const, label: "Usuarios", count: users.length }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <div className="flex items-start justify-between">
          <dl className="grid flex-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Nombre</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{courier.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Código</dt>
              <dd className="mt-1 font-mono text-sm text-gray-600">{courier.code}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Tipo</dt>
              <dd className="mt-1 text-sm text-gray-600">
                {courier.type === "corporativo" ? "Corporativo" : "Box"}
              </dd>
            </div>
          </dl>
          <div className="ml-4">
            <DetailActions actions={detailActions} userRoles={userRoles} />
          </div>
        </div>
      </div>

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
          {activeTab === "agencies" &&
            userRoles.some((r) => ["super_admin", "forwarder_admin", "destination_admin"].includes(r)) && (
            <Link
              href={`/${locale}/agencies/new?courier_id=${courier.id}`}
              className="mb-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Nueva Agencia
            </Link>
          )}
        </div>
      </div>

      {activeTab === "info" && (
        <div className="rounded-lg border bg-white p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">RUC</dt>
              <dd className="mt-1 text-sm text-gray-600">{courier.ruc ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Dirección</dt>
              <dd className="mt-1 text-sm text-gray-600">{courier.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Ciudad</dt>
              <dd className="mt-1 text-sm text-gray-600">{courier.city ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">País</dt>
              <dd className="mt-1 text-sm text-gray-600">{courier.country ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Teléfono</dt>
              <dd className="mt-1 text-sm text-gray-600">{courier.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-600">{courier.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Estado</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    courier.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {courier.is_active ? "Activo" : "Inactivo"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Creado</dt>
              <dd className="mt-1 text-sm text-gray-600">
                {new Date(courier.created_at).toLocaleDateString("es")}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {activeTab === "agencies" && (
        <div className="rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(!courier.agencies || courier.agencies.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Sin agencias asignadas.
                  </td>
                </tr>
              ) : (
                courier.agencies.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/${locale}/agencies/${a.id}`} className="hover:underline">
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {a.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "coverage" && (
        <div className="space-y-4">
          {(!courier.courier_warehouses || courier.courier_warehouses.length === 0) ? (
            <div className="rounded-lg border bg-white px-4 py-8 text-center text-gray-400">
              Sin bodegas asignadas.
            </div>
          ) : (
            courier.courier_warehouses.map((cw) => (
              <div key={cw.id} className="rounded-lg border bg-white">
                <div className="border-b px-4 py-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    Bodega: {cw.warehouses?.name ?? "—"}
                  </h3>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Destino</th>
                      <th className="px-4 py-3">Tránsito</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(!cw.courier_warehouse_destinations || cw.courier_warehouse_destinations.length === 0) ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                          Sin destinos configurados.
                        </td>
                      </tr>
                    ) : (
                      cw.courier_warehouse_destinations.map((cwd) => (
                        <tr key={cwd.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {cwd.destinations?.city ?? "—"} ({cwd.destinations?.country_code ?? "—"})
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {cwd.transit_days != null ? `${cwd.transit_days} días` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                cwd.is_active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {cwd.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "tariffs" && (
        <div className="space-y-4">
          {userRoles.some((r) => ["super_admin", "forwarder_admin"].includes(r)) && (
            <div className="flex justify-end">
              <Link
                href={`/${locale}/tariffs/new?tariff_side=forwarder_to_courier&courier_id=${courier.id}`}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                + Nueva Tarifa
              </Link>
            </div>
          )}
          <div className="rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Lado</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Modalidad</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Rangos</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tariffs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Sin tarifas configuradas para este courier.
                    </td>
                  </tr>
                ) : (
                  tariffs.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.tariff_side === "forwarder_to_courier"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-purple-50 text-purple-700"
                        }`}>
                          {TARIFF_SIDE_LABELS[t.tariff_side as TariffSide] ?? t.tariff_side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {t.destinations ? `${t.destinations.city} (${t.destinations.country_code})` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {t.modality ? (MODALITY_LABELS[t.modality as keyof typeof MODALITY_LABELS] ?? t.modality) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {t.shipping_categories ? `${t.shipping_categories.code}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {t.tariff_brackets?.length ?? 0}
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
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          {userRoles.some((r) => USER_TAB_ROLES.includes(r)) && (
            <div className="flex justify-end">
              <Link
                href={`/${locale}/couriers/${courier.id}/users/new`}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                + Invitar Usuario
              </Link>
            </div>
          )}
          <UserList users={users} allowedRoles={USER_TAB_ROLES} />
        </div>
      )}
    </div>
  );
}
