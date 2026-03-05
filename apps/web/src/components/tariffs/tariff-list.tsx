"use client";

import { RATE_UNIT_LABELS, type RateUnit } from "@no-wms/shared/constants/tariff";
import Link from "next/link";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { filterSelectClass } from "@/components/ui/form-section";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
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
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [viewFilter, setViewFilter] = useState<"base" | "overrides" | "">("");
  const [activeFilter, setActiveFilter] = useState("");
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
    if (warehouseFilter && t.warehouse_id !== warehouseFilter) return false;
    if (viewFilter === "base" && t.agency_id !== null) return false;
    if (viewFilter === "overrides" && t.agency_id === null) return false;
    if (activeFilter === "true" && !t.is_active) return false;
    if (activeFilter === "false" && t.is_active) return false;
    return true;
  });

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
        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todas las bodegas</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select
          value={viewFilter}
          onChange={(e) => setViewFilter(e.target.value as "base" | "overrides" | "")}
          className={filterSelectClass}
        >
          <option value="">Todas las tarifas</option>
          <option value="base">Tarifas base</option>
          <option value="overrides">Overrides agencia</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los estados</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
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
            renderRow={(t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-xs font-medium text-gray-900">
                  {t.handling_costs?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">{t.warehouses?.name ?? "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {t.destinations ? `${t.destinations.city} (${t.destinations.country_code})` : "Todos"}
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  ${Number(t.rate).toFixed(2)}{" "}
                  <span className="text-gray-400">
                    {RATE_UNIT_LABELS[t.rate_unit as RateUnit] ?? t.rate_unit}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {t.minimum_charge != null ? `$${Number(t.minimum_charge).toFixed(2)}` : "—"}
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
                  {new Date(t.effective_from).toLocaleDateString("es")}
                  {t.effective_to && ` — ${new Date(t.effective_to).toLocaleDateString("es")}`}
                </td>
                <td className="px-4 py-3">
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
            )}
          />
        </table>
      </div>
    </div>
  );
}
