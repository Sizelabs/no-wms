"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { DetailSheet } from "@/components/ui/detail-sheet";
import { InfoField } from "@/components/ui/info-field";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { useSheetState } from "@/hooks/use-sheet-state";

interface Consignee {
  id: string;
  full_name: string;
  casillero: string;
  cedula_ruc: string | null;
  city: string | null;
  is_active: boolean;
  agency_id: string;
  agencies: unknown;
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
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

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
    if (statusFilter.length > 0) {
      const matchesStatus = statusFilter.includes("active") && c.is_active || statusFilter.includes("inactive") && !c.is_active;
      if (!matchesStatus) return false;
    }
    return true;
  });

  const { selectedId, selectedItem, open, openSheet, closeSheet } = useSheetState(filtered);

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
        <MultiSelectFilter
          label="Todos los estados"
          options={[
            { value: "active", label: "Activo" },
            { value: "inactive", label: "Inactivo" },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

    <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Casillero</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Cédula/RUC</th>
            <th className="px-4 py-3">Agencia</th>
            <th className="px-4 py-3">Ciudad</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <VirtualTableBody
          items={filtered}
          scrollElement={scrollEl}
          colSpan={6}
          emptyMessage="No hay consignatarios registrados."
          renderRow={(c) => {
            const isSelected = open && c.id === selectedId;
            return (
              <tr
                key={c.id}
                className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
                onClick={() => openSheet(c.id)}
              >
                <td className="px-4 py-3 font-mono text-xs">{c.casillero}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/${locale}/consignees/${c.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
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
            );
          }}
        />
      </table>
    </div>

      <DetailSheet
        open={open}
        onClose={closeSheet}
        title={selectedItem?.full_name ?? ""}
        detailHref={selectedItem ? `/${locale}/consignees/${selectedItem.id}` : undefined}
      >
        {selectedItem && (
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoField label="Casillero" value={selectedItem.casillero} />
            <InfoField label="Nombre" value={selectedItem.full_name} />
            <InfoField label="Cédula/RUC" value={selectedItem.cedula_ruc} />
            <InfoField label="Agencia" value={getAgencyName(selectedItem.agencies)} />
            <InfoField label="Ciudad" value={selectedItem.city} />
            <InfoField label="Estado" value={selectedItem.is_active ? "Activo" : "Inactivo"} />
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
