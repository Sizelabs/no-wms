"use client";

import type { AgencyType } from "@no-wms/shared/constants/agency-types";
import { AGENCY_TYPE_LABELS } from "@no-wms/shared/constants/agency-types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

interface Agency {
  id: string;
  name: string;
  code: string;
  type: AgencyType;
  is_active: boolean;
  destination_countries: { name: string } | null;
}

interface AgencyListProps {
  agencies: Agency[];
}

export function AgencyList({ agencies }: AgencyListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = agencies.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.destination_countries?.name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter === "active" && !a.is_active) return false;
    if (statusFilter === "inactive" && a.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Search + status row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar agencia, código, país..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </select>
      </div>

    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">País Destino</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay agencias registradas.
              </td>
            </tr>
          ) : (
            filtered.map((agency) => (
              <tr key={agency.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{agency.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/${locale}/agencies/${agency.id}`}
                    className="hover:underline"
                  >
                    {agency.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      agency.type === "corporativo"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {AGENCY_TYPE_LABELS[agency.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {agency.destination_countries?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      agency.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {agency.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}
