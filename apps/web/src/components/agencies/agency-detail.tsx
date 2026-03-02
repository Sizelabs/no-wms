"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

interface Consignee {
  id: string;
  full_name: string;
  casillero: string;
  cedula_ruc: string | null;
  city: string | null;
  is_active: boolean;
}

interface AgencyDetailProps {
  agencyId: string;
  consignees: Consignee[];
  children: React.ReactNode; // original agency info content
}

type Tab = "info" | "consignees";

export function AgencyDetail({ agencyId, consignees, children }: AgencyDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const { locale } = useParams<{ locale: string }>();

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "info", label: "Información" },
    { key: "consignees", label: "Consignatarios", count: consignees.length },
  ];

  return (
    <div className="space-y-6">
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
        {activeTab === "consignees" && (
          <Link
            href={`/${locale}/consignees/new?agency_id=${agencyId}`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Consignatario
          </Link>
        )}
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
    </div>
  );
}
