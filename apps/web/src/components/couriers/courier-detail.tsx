"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { deleteCourier } from "@/lib/actions/couriers";

interface CourierWarehouseDestination {
  id: string;
  destination_id: string;
  is_active: boolean;
  base_rate: number | null;
  rate_per_kg: number | null;
  transit_days: number | null;
  destinations: { city: string; country_code: string } | null;
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

interface CourierDetailProps {
  courier: Courier;
}

type Tab = "info" | "agencies" | "coverage";

export function CourierDetail({ courier }: CourierDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const userRoles = useUserRoles();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${courier.name}"? Esta acción no se puede deshacer.`)) return;
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

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "info", label: "Información" },
    { key: "agencies", label: "Agencias", count: courier.agencies?.length ?? 0 },
    { key: "coverage", label: "Cobertura", count: totalDestinations },
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

      <div className="flex items-center justify-between border-b">
        <nav className="-mb-px flex gap-4">
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
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Agencia
          </Link>
        )}
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
                      <th className="px-4 py-3">Tarifa base</th>
                      <th className="px-4 py-3">$/kg</th>
                      <th className="px-4 py-3">Tránsito</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(!cw.courier_warehouse_destinations || cw.courier_warehouse_destinations.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
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
                            {cwd.base_rate != null ? `$${cwd.base_rate}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {cwd.rate_per_kg != null ? `$${cwd.rate_per_kg}` : "—"}
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
    </div>
  );
}
