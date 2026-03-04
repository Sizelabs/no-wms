"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

interface CourrierCoverage {
  id: string;
  destination_countries: { name: string; code: string } | null;
}

interface Courrier {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
  courrier_coverage: CourrierCoverage[];
}

interface CourrierListProps {
  courriers: Courrier[];
}

export function CourrierList({ courriers }: CourrierListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = courriers.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const countries = c.courrier_coverage.map((cv) => cv.destination_countries?.name ?? "").join(" ");
      const matches =
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        countries.toLowerCase().includes(q);
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
          placeholder="Buscar courrier, código, país..."
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
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Cobertura</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No hay courriers registrados.
              </td>
            </tr>
          ) : (
            filtered.map((courrier) => {
              const countries = courrier.courrier_coverage
                .map((c) => c.destination_countries?.name)
                .filter(Boolean);
              const uniqueCountries = [...new Set(countries)];

              return (
                <tr key={courrier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{courrier.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link
                      href={`/${locale}/courriers/${courrier.id}`}
                      className="hover:underline"
                    >
                      {courrier.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        courrier.type === "corporativo"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {courrier.type === "corporativo" ? "Corporativo" : "Box"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {uniqueCountries.length > 0
                      ? uniqueCountries.join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        courrier.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {courrier.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}
