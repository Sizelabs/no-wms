"use client";

import { MAWB_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { updateMawbStatus } from "@/lib/actions/manifests";

interface Hawb {
  id: string;
  hawb_number: string;
  shipping_instruction_id: string;
}

interface Mawb {
  id: string;
  mawb_number: string;
  airline: string;
  flight_number: string | null;
  flight_date: string | null;
  status: string;
  total_pieces: number | null;
  total_weight_lb: number | null;
  created_at: string;
  destinations: { city: string; country_code: string } | null;
  hawbs: Hawb[];
}

interface MawbListProps {
  data: Mawb[];
}

const STATUS_COLORS: Record<string, string> = {
  created: "bg-blue-100 text-blue-800",
  ready_for_flight: "bg-yellow-100 text-yellow-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  arrived: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
};

const STATUS_FLOW: Record<string, string> = {
  created: "ready_for_flight",
  ready_for_flight: "in_transit",
  in_transit: "arrived",
  arrived: "delivered",
};

const STATUS_ACTION_LABELS: Record<string, string> = {
  ready_for_flight: "Listo para Vuelo",
  in_transit: "En Tránsito",
  arrived: "Arribado",
  delivered: "Entregado",
};

export function MawbList({ data }: MawbListProps) {
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const hasActions = data.some((m) => STATUS_FLOW[m.status] !== undefined);

  const filtered = data.filter((m) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        m.mawb_number.toLowerCase().includes(q) ||
        m.airline.toLowerCase().includes(q) ||
        m.flight_number?.toLowerCase().includes(q) ||
        m.destinations?.city?.toLowerCase().includes(q) ||
        m.hawbs.some((h) => h.hawb_number.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (filter.length > 0 && !filter.includes(m.status)) return false;
    return true;
  });

  const handleAdvance = (id: string, currentStatus: string) => {
    const next = STATUS_FLOW[currentStatus];
    if (!next) return;
    startTransition(async () => {
      try {
        await updateMawbStatus(id, next);
        notify(`MAWB actualizado a ${STATUS_ACTION_LABELS[next] ?? next}`, "success");
      } catch {
        notify("Error al actualizar MAWB", "error");
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
          placeholder="Buscar MAWB, aerolínea, vuelo, HAWB..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todos los estados"
          options={Object.entries(MAWB_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          selected={filter}
          onChange={setFilter}
        />
      </div>

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">MAWB #</th>
              <th className="px-4 py-3">Aerolínea</th>
              <th className="px-4 py-3">Vuelo</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">HAWBs</th>
              <th className="px-4 py-3">Pzas</th>
              <th className="px-4 py-3">Peso</th>
              <th className="px-4 py-3">Estado</th>
              {hasActions && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={hasActions ? 10 : 9}
            emptyMessage="No hay MAWBs"
            renderRow={(m) => {
              const nextStatus = STATUS_FLOW[m.status];
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-mono text-xs">{m.mawb_number}</td>
                  <td className="px-4 py-3 text-xs">{m.airline}</td>
                  <td className="px-4 py-3 text-xs">{m.flight_number ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {m.flight_date ? new Date(m.flight_date).toLocaleDateString("es") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{m.destinations?.city ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {m.hawbs.length > 0
                      ? m.hawbs.map((h) => h.hawb_number).join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{m.total_pieces ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {m.total_weight_lb ? `${m.total_weight_lb} lb` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status] ?? ""}`}
                    >
                      {MAWB_STATUS_LABELS[m.status as keyof typeof MAWB_STATUS_LABELS] ?? m.status}
                    </span>
                  </td>
                  {hasActions && (
                  <td className="px-4 py-3">
                    {nextStatus && (
                      <button
                        onClick={() => handleAdvance(m.id, m.status)}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        {STATUS_ACTION_LABELS[nextStatus]}
                      </button>
                    )}
                  </td>
                  )}
                </tr>
              );
            }}
          />
        </table>
      </div>
    </div>
  );
}
