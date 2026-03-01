"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
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

interface CompanyDetailProps {
  company: Organization;
  warehouses: Warehouse[];
  agencies: Agency[];
  users: User[];
}

type Tab = "warehouses" | "agencies" | "users";

export function CompanyDetail({
  company,
  warehouses,
  agencies,
  users,
}: CompanyDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("warehouses");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${company.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteOrganization(company.id);
      if (result?.error) {
        notify(result.error, "error");
      } else {
        router.push(`/${locale}/companies`);
      }
    });
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "warehouses", label: "Bodegas", count: warehouses.length },
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
                {company.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Slug
              </dt>
              <dd className="mt-1 font-mono text-sm text-gray-600">
                {company.slug}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Creada
              </dt>
              <dd className="mt-1 text-sm text-gray-600">
                {new Date(company.created_at).toLocaleDateString("es")}
              </dd>
            </div>
          </dl>
          <div className="ml-4 flex gap-2">
            <Link
              href={`/${locale}/companies/${company.id}/edit`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Editar
            </Link>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Eliminar
            </button>
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
              {tab.label}{" "}
              <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
        {activeTab === "warehouses" && (
          <Link
            href={`/${locale}/companies/${company.id}/warehouses/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Bodega
          </Link>
        )}
        {activeTab === "users" && (
          <Link
            href={`/${locale}/companies/${company.id}/users/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Invitar Usuario
          </Link>
        )}
      </div>

      {activeTab === "warehouses" && (
        <div className="rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Código</th>
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
