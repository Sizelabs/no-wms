"use client";

import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass } from "@/components/ui/form-section";
import { createAwbBatch } from "@/lib/actions/carriers";

interface AwbBatch {
  id: string;
  prefix: string;
  range_start: number;
  range_end: number;
  next_available: number;
  notes: string | null;
  created_at: string;
}

interface AwbBatchPanelProps {
  carrierId: string;
  batches: AwbBatch[];
}

export function AwbBatchPanel({ carrierId, batches }: AwbBatchPanelProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = () => {
    if (!prefix || !rangeStart || !rangeEnd) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("carrier_id", carrierId);
      fd.set("prefix", prefix);
      fd.set("range_start", rangeStart);
      fd.set("range_end", rangeEnd);
      if (notes) fd.set("notes", notes);

      const res = await createAwbBatch(fd);
      if ("error" in res) {
        notify(res.error, "error");
      } else {
        notify("Lote AWB creado", "success");
        setShowForm(false);
        setPrefix("");
        setRangeStart("");
        setRangeEnd("");
        setNotes("");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Lotes de AWB</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
        >
          + Nuevo Lote
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Prefijo *</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="906"
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Inicio rango *</label>
              <input
                type="number"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                placeholder="1000000"
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Fin rango *</label>
              <input
                type="number"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                placeholder="1999999"
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Notas</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reserva semana 12"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || !prefix || !rangeStart || !rangeEnd}
              className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? "Creando..." : "Crear Lote"}
            </button>
          </div>
        </div>
      )}

      {batches.length === 0 ? (
        <p className="text-sm text-gray-500">No hay lotes de AWB registrados.</p>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2">Prefijo</th>
                <th className="px-4 py-2">Rango</th>
                <th className="px-4 py-2">Disponibles</th>
                <th className="px-4 py-2">Usados</th>
                <th className="px-4 py-2">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {batches.map((b) => {
                const total = b.range_end - b.range_start + 1;
                const used = b.next_available - b.range_start;
                const available = total - used;
                const exhausted = available <= 0;
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-2 font-mono text-xs">{b.prefix}</td>
                    <td className="px-4 py-2 text-xs">
                      {b.range_start.toLocaleString()} – {b.range_end.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <span className={exhausted ? "text-red-600 font-medium" : "text-green-700"}>
                        {available > 0 ? available.toLocaleString() : "Agotado"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{used.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{b.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
