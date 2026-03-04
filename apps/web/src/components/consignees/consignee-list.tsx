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
  agency_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agencies: any;
}

interface ConsigneeListProps {
  consignees: Consignee[];
}

function getAgencyName(agencies: unknown): string {
  if (!agencies) return "—";
  if (Array.isArray(agencies)) return (agencies[0] as { name: string })?.name ?? "—";
  return (agencies as { name: string }).name ?? "—";
}

export function ConsigneeList({ consignees }: ConsigneeListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = consignees.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        c.full_name.toLowerCase().includes(q) ||
        c.casillero.toLowerCase().includes(q) ||
        c.cedula_ruc?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        getAgencyName(c.agencies).toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter === "active" && !c.is_active) return false;
    if (statusFilter === "inactive" && c.is_active) return false;
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
          placeholder="Buscar consignatario, casillero, cédula..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Casillero</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Cédula/RUC</th>
            <th className="px-4 py-3">Agencia</th>
            <th className="px-4 py-3">Ciudad</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay consignatarios registrados.
              </td>
            </tr>
          ) : (
            filtered.map((c) => (
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
                <td className="px-4 py-3 text-gray-500">
                  {getAgencyName(c.agencies)}
                </td>
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
    </div>
  );
}
