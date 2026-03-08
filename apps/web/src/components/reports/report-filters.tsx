"use client";

import { useState } from "react";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";

interface ReportFiltersProps {
  agencies?: Array<{ id: string; name: string }>;
  warehouses?: Array<{ id: string; name: string }>;
  showWarehouse?: boolean;
  onFilter: (filters: { agency_id?: string; warehouse_id?: string; date_from?: string; date_to?: string }) => void;
}

export function ReportFilters({ agencies, warehouses, showWarehouse, onFilter }: ReportFiltersProps) {
  const [agencyFilter, setAgencyFilter] = useState<string[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    onFilter({
      agency_id: agencyFilter.length > 0 ? agencyFilter[agencyFilter.length - 1] : undefined,
      warehouse_id: warehouseFilter.length > 0 ? warehouseFilter[warehouseFilter.length - 1] : undefined,
      date_from: (formData.get("date_from") as string) || undefined,
      date_to: (formData.get("date_to") as string) || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
      {agencies && agencies.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500">Agencia</label>
          <MultiSelectFilter
            label="Todas"
            options={agencies.map((a) => ({ value: a.id, label: a.name }))}
            selected={agencyFilter}
            onChange={setAgencyFilter}
          />
        </div>
      )}
      {showWarehouse && warehouses && warehouses.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500">Bodega</label>
          <MultiSelectFilter
            label="Todas"
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            selected={warehouseFilter}
            onChange={setWarehouseFilter}
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-500">Desde</label>
        <input type="date" name="date_from" className="mt-1 rounded border px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">Hasta</label>
        <input type="date" name="date_to" className="mt-1 rounded border px-2 py-1.5 text-sm" />
      </div>
      <button
        type="submit"
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Filtrar
      </button>
    </form>
  );
}
