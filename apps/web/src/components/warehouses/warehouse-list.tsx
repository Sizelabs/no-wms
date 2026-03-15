"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { DetailSheet } from "@/components/ui/detail-sheet";
import { InfoField } from "@/components/ui/info-field";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { WarehouseModal } from "@/components/warehouses/warehouse-modal";
import { useDetailFetch } from "@/hooks/use-detail-fetch";
import { useModalState } from "@/hooks/use-modal-state";
import { useSheetState } from "@/hooks/use-sheet-state";
import { getWarehouse } from "@/lib/actions/warehouses";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  timezone: string;
  is_active: boolean;
}

interface WarehouseListProps {
  warehouses: Warehouse[];
  canCreate?: boolean;
  canUpdate?: boolean;
}

export function WarehouseList({ warehouses, canCreate = false, canUpdate = false }: WarehouseListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const modal = useModalState<Warehouse>();

  const filtered = warehouses.filter((w) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        w.city?.toLowerCase().includes(q) ||
        w.country?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter.length > 0) {
      const isActive = statusFilter.includes("active");
      const isInactive = statusFilter.includes("inactive");
      if (isActive && !isInactive && !w.is_active) return false;
      if (isInactive && !isActive && w.is_active) return false;
    }
    return true;
  });

  const { selectedId, selectedItem, open, openSheet, closeSheet } = useSheetState(filtered);

  const detailData = useDetailFetch(selectedId, getWarehouse);

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={modal.openCreate}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Bodega
          </button>
        </div>
      )}
      {/* Search + status row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar bodega, código, ciudad..."
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
            <th className="px-4 py-3">Ciudad</th>
            <th className="px-4 py-3">País</th>
            <th className="px-4 py-3">Zona Horaria</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <VirtualTableBody
          items={filtered}
          scrollElement={scrollEl}
          colSpan={6}
          emptyMessage="No hay bodegas registradas."
          renderRow={(w) => {
            const isSelected = open && w.id === selectedId;
            return (
              <tr
                key={w.id}
                className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
                onClick={() => openSheet(w.id)}
              >
                <td className="px-4 py-3 font-mono text-xs">{w.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/${locale}/settings/warehouses/${w.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {w.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{w.city ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{w.country ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{w.timezone}</td>
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
            );
          }}
        />
      </table>
    </div>

    <DetailSheet
      open={open}
      onClose={closeSheet}
      title={selectedItem?.name ?? ""}
      detailHref={selectedItem ? `/${locale}/settings/warehouses/${selectedItem.id}` : undefined}
      editAction={canUpdate && selectedItem ? () => { modal.openEdit(selectedItem); } : undefined}
    >
      {selectedItem && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoField label="Código" value={selectedItem.code} />
            <InfoField label="Nombre" value={selectedItem.name} />
            <InfoField label="Ciudad" value={selectedItem.city} />
            <InfoField label="País" value={selectedItem.country} />
            <InfoField label="Zona Horaria" value={selectedItem.timezone} />
            <InfoField label="Estado" value={selectedItem.is_active ? "Activa" : "Inactiva"} />
          </div>
          {detailData?.warehouse_zones && detailData.warehouse_zones.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="mb-3 text-xs font-medium uppercase text-gray-500">
                Zonas ({detailData.warehouse_zones.length})
              </h3>
              <div className="space-y-2">
                {detailData.warehouse_zones.map((zone: { id: string; name: string; code: string; warehouse_locations?: { id: string; label: string; barcode: string }[] }) => (
                  <div key={zone.id} className="rounded-md border p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{zone.name}</span>
                      <span className="font-mono text-xs text-gray-500">{zone.code}</span>
                    </div>
                    {zone.warehouse_locations && zone.warehouse_locations.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {zone.warehouse_locations.map((loc: { id: string; label: string; barcode: string }) => (
                          <span
                            key={loc.id}
                            className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                            title={loc.barcode}
                          >
                            {loc.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </DetailSheet>

    <WarehouseModal
      key={modal.editItem?.id ?? "create"}
      open={modal.createOpen || !!modal.editItem}
      onClose={modal.close}
      warehouse={modal.editItem}
    />
    </div>
  );
}
