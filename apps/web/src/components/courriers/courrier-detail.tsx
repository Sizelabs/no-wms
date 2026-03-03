"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { deleteCourrier } from "@/lib/actions/courriers";

interface Coverage {
  id: string;
  destination_countries: { name: string; code: string } | null;
  city: string | null;
  is_active: boolean;
}

interface Agency {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
}

interface Courrier {
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
  courrier_coverage: Coverage[];
  agencies: Agency[];
}

interface CourrierDetailProps {
  courrier: Courrier;
}

type Tab = "info" | "agencies" | "coverage";

export function CourrierDetail({ courrier }: CourrierDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const userRoles = useUserRoles();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${courrier.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteCourrier(courrier.id);
      if (result?.error) {
        notify(result.error, "error");
      } else {
        router.push(`/${locale}/courriers`);
      }
    });
  }

  const detailActions: DetailAction[] = [
    {
      label: "Editar",
      href: `/${locale}/courriers/${courrier.id}/edit`,
      roles: ["super_admin", "company_admin"],
    },
    {
      label: "Eliminar",
      variant: "danger",
      roles: ["super_admin", "company_admin"],
      onClick: handleDelete,
    },
  ];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "info", label: "Información" },
    { key: "agencies", label: "Agencias", count: courrier.agencies?.length ?? 0 },
    { key: "coverage", label: "Cobertura", count: courrier.courrier_coverage?.length ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <div className="flex items-start justify-between">
          <dl className="grid flex-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Nombre</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{courrier.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Código</dt>
              <dd className="mt-1 font-mono text-sm text-gray-600">{courrier.code}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Tipo</dt>
              <dd className="mt-1 text-sm text-gray-600">
                {courrier.type === "corporativo" ? "Corporativo" : "Box"}
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
      </div>

      {activeTab === "info" && (
        <div className="rounded-lg border bg-white p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">RUC</dt>
              <dd className="mt-1 text-sm text-gray-600">{courrier.ruc ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Dirección</dt>
              <dd className="mt-1 text-sm text-gray-600">{courrier.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Ciudad</dt>
              <dd className="mt-1 text-sm text-gray-600">{courrier.city ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">País</dt>
              <dd className="mt-1 text-sm text-gray-600">{courrier.country ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Teléfono</dt>
              <dd className="mt-1 text-sm text-gray-600">{courrier.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-600">{courrier.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Estado</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    courrier.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {courrier.is_active ? "Activo" : "Inactivo"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Creado</dt>
              <dd className="mt-1 text-sm text-gray-600">
                {new Date(courrier.created_at).toLocaleDateString("es")}
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
              {(!courrier.agencies || courrier.agencies.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Sin agencias asignadas.
                  </td>
                </tr>
              ) : (
                courrier.agencies.map((a) => (
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
        <div className="rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">País</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(!courrier.courrier_coverage || courrier.courrier_coverage.length === 0) ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    Sin cobertura configurada.
                  </td>
                </tr>
              ) : (
                courrier.courrier_coverage.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.destination_countries?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.city ?? "Todo el país"}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
