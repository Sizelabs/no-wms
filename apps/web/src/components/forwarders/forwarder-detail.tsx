"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { UserList } from "@/components/users/user-list";
import { deleteOrganization } from "@/lib/actions/organizations";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  is_active: boolean;
}

interface CourierDestination {
  id: string;
  destinations: { city: string; country_code: string } | null;
}

interface Courier {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
  courier_destinations: CourierDestination[];
}

interface Agency {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
}

interface User {
  id: string;
  full_name: string;
  is_active: boolean;
  user_roles: { id: string; role: string }[];
}

interface ForwarderDetailProps {
  forwarder: Organization;
  warehouses: Warehouse[];
  couriers: Courier[];
  agencies: Agency[];
  users: User[];
}

type Tab = "warehouses" | "couriers" | "agencies" | "users";

export function ForwarderDetail({
  forwarder,
  warehouses,
  couriers,
  agencies,
  users,
}: ForwarderDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("warehouses");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const userRoles = useUserRoles();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${forwarder.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteOrganization(forwarder.id);
      if (result?.error) {
        notify(result.error, "error");
      } else {
        router.push(`/${locale}/settings/forwarders`);
      }
    });
  }

  const detailActions: DetailAction[] = [
    {
      label: "Editar",
      href: `/${locale}/settings/forwarders/${forwarder.id}/edit`,
      roles: ["super_admin", "forwarder_admin"],
    },
    {
      label: "Eliminar",
      variant: "danger",
      roles: ["super_admin"],
      onClick: handleDelete,
    },
  ];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "warehouses", label: "Bodegas", count: warehouses.length },
    { key: "couriers", label: "Couriers", count: couriers.length },
    { key: "agencies", label: "Agencias", count: agencies.length },
    { key: "users", label: "Usuarios", count: users.length },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <div className="flex items-start justify-between">
          <dl className="grid flex-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Nombre
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {forwarder.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Slug
              </dt>
              <dd className="mt-1 font-mono text-sm text-gray-600">
                {forwarder.slug}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Creada
              </dt>
              <dd className="mt-1 text-sm text-gray-600">
                {new Date(forwarder.created_at).toLocaleDateString("es")}
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
                {tab.label}{" "}
                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
          {activeTab === "warehouses" && (
            <Link
              href={`/${locale}/settings/forwarders/${forwarder.id}/warehouses/new`}
              className="mb-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Nueva Bodega
            </Link>
          )}
          {activeTab === "couriers" && (
            <Link
              href={`/${locale}/settings/couriers/new`}
              className="mb-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Nuevo Courier
            </Link>
          )}
          {activeTab === "agencies" && (
            <Link
              href={`/${locale}/agencies/new`}
              className="mb-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Nueva Agencia
            </Link>
          )}
          {activeTab === "users" && (
            <Link
              href={`/${locale}/settings/forwarders/${forwarder.id}/users/new`}
              className="mb-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Invitar Usuario
            </Link>
          )}
        </div>
      </div>

      {activeTab === "warehouses" && (
        <div className="rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Identificador</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">País</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {warehouses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Sin bodegas.
                  </td>
                </tr>
              ) : (
                warehouses.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{w.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {w.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {w.city ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {w.country ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          w.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {w.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "couriers" && (
        <div className="rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Identificador</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Destinos</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {couriers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Sin couriers.
                  </td>
                </tr>
              ) : (
                couriers.map((c) => {
                  const destinations = c.courier_destinations
                    .map((cd) => cd.destinations?.city)
                    .filter(Boolean);
                  const uniqueDestinations = [...new Set(destinations)];
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link
                          href={`/${locale}/settings/couriers/${c.id}`}
                          className="hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.type === "corporativo" ? "Corporativo" : "Box"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {uniqueDestinations.length > 0
                          ? uniqueDestinations.join(", ")
                          : "—"}
                      </td>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "agencies" && (
        <div className="rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Identificador</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agencies.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Sin agencias.
                  </td>
                </tr>
              ) : (
                agencies.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {a.name}
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

      {activeTab === "users" && <UserList users={users} />}
    </div>
  );
}
