"use client";

import type { ShipmentModality, ShipmentStatus } from "@no-wms/shared/constants/statuses";

import { SHIPMENT_STATUS_FLOW, SHIPMENT_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { updateShipmentStatus } from "@/lib/actions/shipments";

const MODALITY_LABELS: Record<string, string> = {
  air: "Aéreo",
  ocean: "Marítimo",
  ground: "Terrestre",
};

const MODALITY_COLORS: Record<string, string> = {
  air: "bg-sky-50 text-sky-700",
  ocean: "bg-blue-50 text-blue-700",
  ground: "bg-amber-50 text-amber-700",
};

interface HouseBill {
  id: string;
  hawb_number: string;
  document_type: string;
  shipping_instruction_id: string;
}

interface Shipment {
  id: string;
  shipment_number: string;
  modality: string;
  status: string;
  awb_number: string | null;
  bol_number: string | null;
  route_number: string | null;
  flight_number: string | null;
  vessel_name: string | null;
  departure_date: string | null;
  total_pieces: number | null;
  total_weight_lb: number | null;
  created_at: string;
  carriers: { name: string; code: string } | null;
  destinations: { city: string; country_code: string } | null;
  hawbs: HouseBill[];
}

interface ShipmentListProps {
  data: Shipment[];
}

export function ShipmentList({ data }: ShipmentListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const hasActions = data.some((s) => {
    const flow = SHIPMENT_STATUS_FLOW[s.modality as ShipmentModality];
    return flow && flow[s.status as ShipmentStatus] !== undefined;
  });

  const filtered = data.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        s.shipment_number.toLowerCase().includes(q) ||
        s.awb_number?.toLowerCase().includes(q) ||
        s.bol_number?.toLowerCase().includes(q) ||
        s.carriers?.name.toLowerCase().includes(q) ||
        s.destinations?.city?.toLowerCase().includes(q) ||
        s.hawbs.some((h) => h.hawb_number.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (modalityFilter.length > 0 && !modalityFilter.includes(s.modality)) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(s.status)) return false;
    return true;
  });

  const handleAdvance = (id: string, modality: string, currentStatus: string) => {
    const flow = SHIPMENT_STATUS_FLOW[modality as ShipmentModality];
    const next = flow?.[currentStatus as ShipmentStatus];
    if (!next) return;
    startTransition(async () => {
      const res = await updateShipmentStatus(id, next);
      if (res.error) {
        notify(res.error, "error");
      } else {
        notify(`Embarque actualizado a ${SHIPMENT_STATUS_LABELS[next] ?? next}`, "success");
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
          placeholder="Buscar embarque, AWB, BOL, transportista..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Modalidad"
          options={[
            { value: "air", label: "Aéreo" },
            { value: "ocean", label: "Marítimo" },
            { value: "ground", label: "Terrestre" },
          ]}
          selected={modalityFilter}
          onChange={setModalityFilter}
        />
        <MultiSelectFilter
          label="Estado"
          options={Object.entries(SHIPMENT_STATUS_LABELS)
            .filter(([k]) => k !== "cancelled")
            .map(([k, v]) => ({ value: k, label: v }))}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3">Embarque #</th>
              <th className="px-3 py-3">Modalidad</th>
              <th className="px-3 py-3">Transportista</th>
              <th className="px-3 py-3">AWB / BOL</th>
              <th className="px-3 py-3">Destino</th>
              <th className="px-3 py-3">Guías</th>
              <th className="px-3 py-3">Pzas</th>
              <th className="px-3 py-3">Peso</th>
              <th className="px-3 py-3">Estado</th>
              {hasActions && <th className="px-3 py-3">Acciones</th>}
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={hasActions ? 10 : 9}
            emptyMessage="No hay embarques"
            renderRow={(s) => {
              const flow = SHIPMENT_STATUS_FLOW[s.modality as ShipmentModality];
              const nextStatus = flow?.[s.status as ShipmentStatus];
              const documentNumber = s.awb_number || s.bol_number || s.route_number || "—";
              return (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <Link href={`/${locale}/shipments/${s.id}`} className="font-mono text-xs font-medium text-gray-900 hover:underline">
                      {s.shipment_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MODALITY_COLORS[s.modality] ?? ""}`}>
                      {MODALITY_LABELS[s.modality] ?? s.modality}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{s.carriers?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{documentNumber}</td>
                  <td className="px-3 py-2.5 text-xs">{s.destinations?.city ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                    {s.hawbs.length > 0
                      ? s.hawbs.map((h) => h.hawb_number).join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{s.total_pieces ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {s.total_weight_lb ? `${s.total_weight_lb} lb` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <ShipmentStatusBadge status={s.status} />
                  </td>
                  {hasActions && (
                    <td className="px-3 py-2.5">
                      {nextStatus && (
                        <button
                          onClick={() => handleAdvance(s.id, s.modality, s.status)}
                          disabled={isPending}
                          className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          {SHIPMENT_STATUS_LABELS[nextStatus] ?? nextStatus}
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
