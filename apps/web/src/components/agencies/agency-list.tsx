"use client";

import type { AgencyType } from "@no-wms/shared/constants/agency-types";
import { AGENCY_TYPE_LABELS } from "@no-wms/shared/constants/agency-types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";

interface Agency {
  id: string;
  name: string;
  code: string;
  type: AgencyType;
  is_active: boolean;
  agency_destinations: {
    is_home: boolean;
    destinations: { city: string; country_code: string } | null;
  }[] | null;
}

interface AgencyListProps {
  agencies: Agency[];
}

export function AgencyList({ agencies }: AgencyListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = agencies.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      const homeDestination = a.agency_destinations?.find((d) => d.is_home)?.destinations;
      const matches =
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        homeDestination?.city?.toLowerCase().includes(q) ||
        homeDestination?.country_code?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter.length > 0) {
      const isActive = statusFilter.includes("active");
      const isInactive = statusFilter.includes("inactive");
      if (isActive && !isInactive && !a.is_active) return false;
      if (isInactive && !isActive && a.is_active) return false;
    }
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
        <MultiSelectFilter
          label="Todos los estados"
          options={[
            { value: "active", label: "Activa" },
            { value: "inactive", label: "Inactiva" },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

    <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Identificador</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">País Destino</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <VirtualTableBody
          items={filtered}
          scrollElement={scrollEl}
          colSpan={6}
          emptyMessage="No hay agencias registradas."
          renderRow={(agency) => (
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
                {(() => {
                  const home = agency.agency_destinations?.find((d) => d.is_home)?.destinations;
                  return home ? `${home.city}, ${home.country_code}` : "—";
                })()}
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
          )}
        />
      </table>
    </div>
    </div>
  );
}
