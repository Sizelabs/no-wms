"use client";

import { COURIER_TYPE_LABELS } from "@no-wms/shared/constants/courier-types";
import type { CourierType } from "@no-wms/shared/constants/courier-types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { DetailSheet } from "@/components/ui/detail-sheet";
import { InfoField } from "@/components/ui/info-field";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { useSheetState } from "@/hooks/use-sheet-state";

interface CourierDestination {
  id: string;
  destination_id: string;
  is_active: boolean;
  destinations: { city: string; state: string | null; country_code: string } | null;
}

interface Courier {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
  courier_destinations: CourierDestination[];
}

interface CourierListProps {
  couriers: Courier[];
}

export function CourierList({ couriers }: CourierListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = couriers.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const destinations = c.courier_destinations
        .map((cd) => cd.destinations?.city ?? "")
        .join(" ");
      const matches =
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        destinations.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter.length > 0) {
      const isActive = c.is_active ? "active" : "inactive";
      if (!statusFilter.includes(isActive)) return false;
    }
    return true;
  });

  const { selectedId, selectedItem, open, openSheet, closeSheet } = useSheetState(filtered);

  const selectedDestinations = selectedItem
    ? [
        ...new Set(
          selectedItem.courier_destinations
            .filter((cd) => cd.is_active)
            .map((cd) => cd.destinations?.city)
            .filter(Boolean),
        ),
      ]
    : [];

  return (
    <div className="space-y-3">
      {/* Search + status row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar courier, código, destino..."
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
            <th className="px-4 py-3">Identificador</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Destinos</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <VirtualTableBody
          items={filtered}
          scrollElement={scrollEl}
          colSpan={5}
          emptyMessage="No hay couriers registrados."
          renderRow={(courier) => {
            const destinations = courier.courier_destinations
              .filter((cd) => cd.is_active)
              .map((cd) => cd.destinations?.city)
              .filter(Boolean);
            const uniqueDestinations = [...new Set(destinations)];
            const isSelected = open && courier.id === selectedId;

            return (
              <tr
                key={courier.id}
                className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
                onClick={() => openSheet(courier.id)}
              >
                <td className="px-4 py-3 font-mono text-xs">{courier.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/${locale}/settings/couriers/${courier.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {courier.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      courier.type === "corporativo"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {COURIER_TYPE_LABELS[courier.type as CourierType] ?? courier.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {uniqueDestinations.length > 0
                    ? uniqueDestinations.join(", ")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      courier.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {courier.is_active ? "Activo" : "Inactivo"}
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
      title={selectedItem?.name ?? ""}
      detailHref={selectedItem ? `/${locale}/settings/couriers/${selectedItem.id}` : undefined}
    >
      {selectedItem && (
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoField label="Código" value={selectedItem.code} />
          <InfoField label="Nombre" value={selectedItem.name} />
          <InfoField label="Tipo" value={COURIER_TYPE_LABELS[selectedItem.type as CourierType] ?? selectedItem.type} />
          <InfoField label="Destinos" value={selectedDestinations.length > 0 ? selectedDestinations.join(", ") : null} />
          <InfoField label="Estado" value={selectedItem.is_active ? "Activo" : "Inactivo"} />
        </div>
      )}
    </DetailSheet>
    </div>
  );
}
