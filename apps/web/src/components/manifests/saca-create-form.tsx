"use client";

import { useState, useTransition } from "react";

import { createSaca } from "@/lib/actions/manifests";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface MawbOption {
  id: string;
  mawb_number: string;
}

interface WrOption {
  id: string;
  wr_number: string;
  packages?: { tracking_number: string }[];
}

interface SacaCreateFormProps {
  warehouses: Warehouse[];
  mawbs: MawbOption[];
  availableWrs: WrOption[];
}

export function SacaCreateForm({ warehouses, mawbs, availableWrs }: SacaCreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [mawbId, setMawbId] = useState("");
  const [selectedWrs, setSelectedWrs] = useState<string[]>([]);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const toggleWr = (wrId: string) => {
    setSelectedWrs((prev) =>
      prev.includes(wrId) ? prev.filter((id) => id !== wrId) : [...prev, wrId],
    );
  };

  const handleSubmit = () => {
    if (!selectedWrs.length || !warehouseId) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("warehouse_id", warehouseId);
      if (mawbId) fd.set("mawb_id", mawbId);
      fd.set("warehouse_receipt_ids", JSON.stringify(selectedWrs));

      const res = await createSaca(fd);
      if ("error" in res) {
        setResult({ error: res.error });
      } else {
        setResult({ success: true });
        setSelectedWrs([]);
      }
    });
  };

  return (
    <div className="space-y-4">
      {result?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      )}
      {result?.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Saca creada exitosamente
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Bodega</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            disabled={warehouses.length <= 1}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">MAWB (opcional)</label>
          <select
            value={mawbId}
            onChange={(e) => setMawbId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          >
            <option value="">Sin asignar</option>
            {mawbs.map((m) => (
              <option key={m.id} value={m.id}>
                {m.mawb_number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Seleccionar WRs ({selectedWrs.length} seleccionados)
        </label>
        <div className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-white">
          {availableWrs.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-gray-400">No hay WRs disponibles</p>
          ) : (
            availableWrs.map((wr) => (
              <label
                key={wr.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedWrs.includes(wr.id)}
                  onChange={() => toggleWr(wr.id)}
                  className="rounded border-gray-300"
                />
                <span className="font-mono text-xs">{wr.wr_number}</span>
                <span className="text-xs text-gray-500">{wr.packages?.[0]?.tracking_number ?? ""}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isPending || !selectedWrs.length}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear Saca"}
        </button>
      </div>
    </div>
  );
}
