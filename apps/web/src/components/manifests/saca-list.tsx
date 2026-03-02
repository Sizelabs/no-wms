"use client";

import { useState, useTransition } from "react";

import { updateSacaStatus } from "@/lib/actions/manifests";

interface SacaItem {
  warehouse_receipt_id: string;
  warehouse_receipts: {
    wr_number: string;
    packages: { tracking_number: string }[];
  } | null;
}

interface Saca {
  id: string;
  saca_number: string;
  status: string;
  created_at: string;
  mawbs: { mawb_number: string } | null;
  saca_items: SacaItem[];
}

interface SacaListProps {
  data: Saca[];
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  sealed: "bg-yellow-100 text-yellow-800",
  dispatched: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  sealed: "Sellada",
  dispatched: "Despachada",
};

export function SacaList({ data }: SacaListProps) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");

  const filtered = data.filter((s) => {
    if (filter && s.status !== filter) return false;
    return true;
  });

  const handleSeal = (id: string) => {
    startTransition(async () => {
      await updateSacaStatus(id, "sealed");
    });
  };

  const handleDispatch = (id: string) => {
    startTransition(async () => {
      await updateSacaStatus(id, "dispatched");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Saca #</th>
              <th className="px-4 py-3">MAWB</th>
              <th className="px-4 py-3">WRs</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-mono text-xs">{s.saca_number}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.mawbs?.mawb_number ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{s.saca_items.length}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status] ?? ""}`}
                  >
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(s.created_at).toLocaleDateString("es")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {s.status === "open" && (
                      <button
                        onClick={() => handleSeal(s.id)}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-yellow-700 hover:bg-yellow-50"
                      >
                        Sellar
                      </button>
                    )}
                    {s.status === "sealed" && (
                      <button
                        onClick={() => handleDispatch(s.id)}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                      >
                        Despachar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No hay sacas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
