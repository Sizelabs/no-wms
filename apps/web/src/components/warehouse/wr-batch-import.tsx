"use client";

import { CARRIERS } from "@no-wms/shared/constants/carriers";
import { PACKAGE_TYPES } from "@no-wms/shared/constants/package-types";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";

import { Combobox } from "@/components/ui/combobox";
import { createWarehouseReceipt } from "@/lib/actions/warehouse-receipts";

interface Agency {
  id: string;
  name: string;
  code: string;
  organization_id: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  organization_id: string;
  organization_name: string | null;
}

interface BatchRow {
  tracking_number: string;
  carrier: string;
  actual_weight_lb: string;
  length_in: string;
  width_in: string;
  height_in: string;
  consignee_name: string;
  pieces_count: string;
  package_type: string;
  notes: string;
}

const EMPTY_ROW: BatchRow = {
  tracking_number: "",
  carrier: "",
  actual_weight_lb: "",
  length_in: "",
  width_in: "",
  height_in: "",
  consignee_name: "",
  pieces_count: "1",
  package_type: "Box",
  notes: "",
};

interface WrBatchImportProps {
  agencies: Agency[];
  warehouses: Warehouse[];
  isSuperAdmin?: boolean;
}

function warehouseLabel(w: Warehouse, showOrg: boolean): string {
  const base = `${w.name} (${w.code})`;
  return showOrg && w.organization_name ? `${base} — ${w.organization_name}` : base;
}

export function WrBatchImport({ agencies, warehouses, isSuperAdmin = false }: WrBatchImportProps) {
  const [isPending, startTransition] = useTransition();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [agencyId, setAgencyId] = useState("");

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === warehouseId),
    [warehouses, warehouseId],
  );
  const filteredAgencies = useMemo(
    () =>
      selectedWarehouse
        ? agencies.filter((a) => a.organization_id === selectedWarehouse.organization_id)
        : agencies,
    [agencies, selectedWarehouse],
  );
  const [rows, setRows] = useState<BatchRow[]>([{ ...EMPTY_ROW }]);
  const [results, setResults] = useState<{ index: number; success: boolean; error?: string }[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      // Skip header row
      const dataLines = lines.length > 1 && lines[0]!.toLowerCase().includes("tracking") ? lines.slice(1) : lines;

      const newRows: BatchRow[] = dataLines.map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        return {
          tracking_number: cols[0] ?? "",
          carrier: cols[1] ?? "",
          actual_weight_lb: cols[2] ?? "",
          length_in: cols[3] ?? "",
          width_in: cols[4] ?? "",
          height_in: cols[5] ?? "",
          consignee_name: cols[6] ?? "",
          pieces_count: cols[7] || "1",
          package_type: cols[8] || "Box",
          notes: cols[9] ?? "",
        };
      }).filter((r) => r.tracking_number);

      if (newRows.length) {
        setRows(newRows);
        setResults([]);
      }
    };
    reader.readAsText(file);
  }, []);

  const updateRow = (index: number, field: keyof BatchRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAll = () => {
    if (!agencyId || !warehouseId) return;

    startTransition(async () => {
      const newResults: typeof results = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        if (!row.tracking_number.trim()) {
          newResults.push({ index: i, success: false, error: "Guía requerida" });
          continue;
        }

        try {
          const formData = new FormData();
          formData.set("warehouse_id", warehouseId);
          formData.set("agency_id", agencyId);
          formData.set("tracking_number", row.tracking_number.trim());
          formData.set("carrier", row.carrier);
          if (row.actual_weight_lb) formData.set("actual_weight_lb", row.actual_weight_lb);
          if (row.length_in) formData.set("length_in", row.length_in);
          if (row.width_in) formData.set("width_in", row.width_in);
          if (row.height_in) formData.set("height_in", row.height_in);
          formData.set("pieces_count", row.pieces_count || "1");
          if (row.package_type) formData.set("package_type", row.package_type);
          if (row.notes) formData.set("notes", row.notes);

          await createWarehouseReceipt(formData);
          newResults.push({ index: i, success: true });
        } catch (err) {
          newResults.push({
            index: i,
            success: false,
            error: err instanceof Error ? err.message : "Error",
          });
        }
      }

      setResults(newResults);
    });
  };

  return (
    <div className="space-y-4">
      {/* Warehouse + Agency selectors */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Bodega</label>
          <div className="mt-1">
            <Combobox
              options={warehouses.map((w) => ({
                value: w.id,
                label: warehouseLabel(w, isSuperAdmin),
              }))}
              value={warehouseId}
              onChange={(id) => {
                setWarehouseId(id);
                // Reset agency if it no longer belongs to the new warehouse's org
                const newWh = warehouses.find((w) => w.id === id);
                if (newWh && agencyId) {
                  const agencyStillValid = agencies.some(
                    (a) => a.id === agencyId && a.organization_id === newWh.organization_id,
                  );
                  if (!agencyStillValid) setAgencyId("");
                }
              }}
              placeholder="Buscar bodega..."
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Agencia</label>
          <select
            value={agencyId}
            onChange={(e) => setAgencyId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          >
            <option value="">Seleccionar...</option>
            {filteredAgencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Batch entry table */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Guía *</th>
              <th className="px-2 py-2">Transportista</th>
              <th className="px-2 py-2">Peso (lb)</th>
              <th className="px-2 py-2">L × W × H (in)</th>
              <th className="px-2 py-2">Piezas</th>
              <th className="px-2 py-2">Tipo</th>
              <th className="px-2 py-2">Notas</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, i) => {
              const result = results.find((r) => r.index === i);
              return (
                <tr key={i} className={result?.success === false ? "bg-red-50" : result?.success ? "bg-green-50" : ""}>
                  <td className="px-2 py-1.5 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.tracking_number}
                      onChange={(e) => updateRow(i, "tracking_number", e.target.value)}
                      className="w-36 rounded border px-2 py-1 text-xs focus:border-gray-900 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.carrier}
                      onChange={(e) => updateRow(i, "carrier", e.target.value)}
                      className="w-24 rounded border px-1 py-1 text-xs focus:border-gray-900 focus:outline-none"
                    >
                      <option value="">—</option>
                      {CARRIERS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={row.actual_weight_lb}
                      onChange={(e) => updateRow(i, "actual_weight_lb", e.target.value)}
                      className="w-16 rounded border px-2 py-1 text-xs focus:border-gray-900 focus:outline-none"
                    />
                  </td>
                  <td className="flex gap-1 px-2 py-1.5">
                    <input
                      type="number"
                      step="0.1"
                      value={row.length_in}
                      onChange={(e) => updateRow(i, "length_in", e.target.value)}
                      placeholder="L"
                      className="w-12 rounded border px-1 py-1 text-xs focus:border-gray-900 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={row.width_in}
                      onChange={(e) => updateRow(i, "width_in", e.target.value)}
                      placeholder="W"
                      className="w-12 rounded border px-1 py-1 text-xs focus:border-gray-900 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={row.height_in}
                      onChange={(e) => updateRow(i, "height_in", e.target.value)}
                      placeholder="H"
                      className="w-12 rounded border px-1 py-1 text-xs focus:border-gray-900 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="1"
                      value={row.pieces_count}
                      onChange={(e) => updateRow(i, "pieces_count", e.target.value)}
                      className="w-12 rounded border px-2 py-1 text-xs focus:border-gray-900 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.package_type}
                      onChange={(e) => updateRow(i, "package_type", e.target.value)}
                      className="w-20 rounded border px-1 py-1 text-xs focus:border-gray-900 focus:outline-none"
                    >
                      {PACKAGE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateRow(i, "notes", e.target.value)}
                      className="w-24 rounded border px-2 py-1 text-xs focus:border-gray-900 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-xs">
                    {result?.success ? (
                      <span className="text-green-600">OK</span>
                    ) : result?.error ? (
                      <span className="text-red-600">{result.error}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          + Agregar fila
        </button>
        <button
          type="button"
          onClick={() => csvInputRef.current?.click()}
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Importar CSV
        </button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCsvUpload(file);
            e.target.value = "";
          }}
          className="hidden"
        />
        <span className="self-center text-xs text-gray-400">
          CSV: tracking, carrier, peso, largo, ancho, alto, destinatario, piezas, tipo, notas
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={isPending || !agencyId}
          className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Procesando..." : `Importar ${rows.length} paquete(s)`}
        </button>
      </div>
    </div>
  );
}
