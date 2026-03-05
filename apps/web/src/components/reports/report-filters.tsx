"use client";

import { filterSelectClass } from "@/components/ui/form-section";

interface ReportFiltersProps {
  agencies?: Array<{ id: string; name: string }>;
  warehouses?: Array<{ id: string; name: string }>;
  showWarehouse?: boolean;
  onFilter: (filters: { agency_id?: string; warehouse_id?: string; date_from?: string; date_to?: string }) => void;
}

export function ReportFilters({ agencies, warehouses, showWarehouse, onFilter }: ReportFiltersProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    onFilter({
      agency_id: (formData.get("agency_id") as string) || undefined,
      warehouse_id: (formData.get("warehouse_id") as string) || undefined,
      date_from: (formData.get("date_from") as string) || undefined,
      date_to: (formData.get("date_to") as string) || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
      {agencies && agencies.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500">Agencia</label>
          <select name="agency_id" className={filterSelectClass}>
            <option value="">Todas</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}
      {showWarehouse && warehouses && warehouses.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500">Bodega</label>
          <select name="warehouse_id" className={filterSelectClass}>
            <option value="">Todas</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
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
