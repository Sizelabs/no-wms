"use client";

import { RATE_UNIT_LABELS, type RateUnit } from "@no-wms/shared/constants/tariff";
import Link from "next/link";
import { useState, useTransition } from "react";

import { formatCurrency, formatDate } from "@/lib/format";
import { useNotification } from "@/components/layout/notification";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { InfoField } from "@/components/ui/info-field";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { useSheetState } from "@/hooks/use-sheet-state";
import { deleteTariffSchedule } from "@/lib/actions/tariffs";

interface TariffSchedule {
  id: string;
  warehouse_id: string;
  handling_cost_id: string;
  destination_id: string | null;
  agency_id: string | null;
  courier_id: string | null;
  rate: number;
  rate_unit: string;
  minimum_charge: number | null;
  currency: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  warehouses: { id: string; name: string } | null;
  handling_costs: { id: string; name: string } | null;
  destinations: { id: string; city: string; country_code: string } | null;
  agencies: { id: string; name: string; code: string } | null;
  couriers: { id: string; name: string; code: string } | null;
}

interface Warehouse {
  id: string;
  name: string;
}

interface TariffListProps {
  data: TariffSchedule[];
  warehouses: Warehouse[];
}

export function TariffList({ data, warehouses }: TariffListProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string[]>([]);
  const [viewFilter, setViewFilter] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = data.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        t.handling_costs?.name?.toLowerCase().includes(q) ||
        t.destinations?.city?.toLowerCase().includes(q) ||
        t.agencies?.name?.toLowerCase().includes(q) ||
        t.couriers?.name?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (warehouseFilter.length > 0 && !warehouseFilter.includes(t.warehouse_id)) return false;
    if (viewFilter.length > 0) {
      const isBase = t.agency_id === null;
      const matchesView = viewFilter.includes("base") && isBase || viewFilter.includes("overrides") && !isBase;
      if (!matchesView) return false;
    }
    if (activeFilter.length > 0) {
      const matchesActive = activeFilter.includes("true") && t.is_active || activeFilter.includes("false") && !t.is_active;
      if (!matchesActive) return false;
    }
    return true;
  });

  const { selectedId, selectedItem, open, openSheet, closeSheet } = useSheetState(filtered);

  const handleDeactivate = (id: string) => {
    if (!confirm("¿Desactivar esta tarifa?")) return;
    startTransition(async () => {
      const result = await deleteTariffSchedule(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Tarifa desactivada", "success");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar costo de manejo, destino, agencia..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todas las bodegas"
          options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          selected={warehouseFilter}
          onChange={setWarehouseFilter}
        />
        <MultiSelectFilter
          label="Todas las tarifas"
          options={[
            { value: "base", label: "Tarifas base" },
            { value: "overrides", label: "Overrides agencia" },
          ]}
          selected={viewFilter}
          onChange={setViewFilter}
        />
        <MultiSelectFilter
          label="Todos los estados"
          options={[
            { value: "true", label: "Activas" },
            { value: "false", label: "Inactivas" },
          ]}
          selected={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Costo de Manejo</th>
              <th className="px-4 py-3">Bodega</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Tarifa</th>
              <th className="px-4 py-3">Mín.</th>
              <th className="px-4 py-3">Courier</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Vigencia</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={10}
            emptyMessage="No hay tarifas configuradas"
            renderRow={(t) => {
              const isSelected = open && t.id === selectedId;
              return (
                <tr
                  key={t.id}
                  className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
                  onClick={() => openSheet(t.id)}
                >
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">
                    {t.handling_costs?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{t.warehouses?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {t.destinations ? `${t.destinations.city} (${t.destinations.country_code})` : "Todos"}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">
                    {formatCurrency(t.rate)}{" "}
                    <span className="text-gray-400">
                      {RATE_UNIT_LABELS[t.rate_unit as RateUnit] ?? t.rate_unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t.minimum_charge != null ? formatCurrency(t.minimum_charge) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t.couriers ? t.couriers.code : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t.agencies ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {t.agencies.name}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {t.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {formatDate(t.effective_from)}
                    {t.effective_to && ` — ${formatDate(t.effective_to)}`}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Link
                        href={`tariffs/${t.id}`}
                        className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`tariffs/${t.id}/edit`}
                        className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Editar
                      </Link>
                      {t.is_active && (
                        <button
                          onClick={() => handleDeactivate(t.id)}
                          disabled={isPending}
                          className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
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
        title={selectedItem?.handling_costs?.name ?? "Tarifa"}
        detailHref={selectedItem ? `tariffs/${selectedItem.id}` : undefined}
      >
        {selectedItem && (
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoField label="Costo de Manejo" value={selectedItem.handling_costs?.name} />
            <InfoField label="Bodega" value={selectedItem.warehouses?.name} />
            <InfoField label="Destino" value={selectedItem.destinations ? `${selectedItem.destinations.city} (${selectedItem.destinations.country_code})` : "Todos"} />
            <InfoField label="Tarifa" value={`${formatCurrency(selectedItem.rate)} ${RATE_UNIT_LABELS[selectedItem.rate_unit as RateUnit] ?? selectedItem.rate_unit}`} />
            <InfoField label="Mínimo" value={selectedItem.minimum_charge != null ? formatCurrency(selectedItem.minimum_charge) : null} />
            <InfoField label="Moneda" value={selectedItem.currency} />
            <InfoField label="Courier" value={selectedItem.couriers?.code} />
            <InfoField label="Agencia" value={selectedItem.agencies?.name} />
            <InfoField label="Estado" value={selectedItem.is_active ? "Activa" : "Inactiva"} />
            <InfoField label="Vigencia" value={`${formatDate(selectedItem.effective_from)}${selectedItem.effective_to ? ` — ${formatDate(selectedItem.effective_to)}` : ""}`} />
            <InfoField label="Notas" value={selectedItem.notes} />
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
