"use client";

import { SHIPMENT_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ShipmentDetailSheet } from "@/components/shipments/shipment-detail-sheet";
import { ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { getNextShipmentStatus, getShipmentStatusLabel, useAdvanceShipmentStatus } from "@/hooks/use-advance-shipment-status";
import { getShipment } from "@/lib/actions/shipments";
import { MODALITY_COLORS, MODALITY_LABELS } from "@/lib/constants/modalities";
import type { ShipmentDetail as ShipmentDetailData } from "@/lib/types/shipments";

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
  const { advance, isPending } = useAdvanceShipmentStatus();
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<ShipmentDetailData | null>(null);
  const fetchNonce = useRef(0);

  const sheetOpen = selectedId !== null;

  const hasActions = data.some((s) => getNextShipmentStatus(s.modality, s.status) !== undefined);

  const filtered = useMemo(() => data.filter((s) => {
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
  }), [data, search, modalityFilter, statusFilter]);

  const openSheet = useCallback(async (id: string) => {
    setSelectedId(id);
    // Immediately populate sheet with row data (all shipment columns are in `*`)
    const row = data.find((s) => s.id === id);
    if (row) {
      setSheetData({
        ...(row as unknown as ShipmentDetailData),
        agencies: null,
        hawbs: row.hawbs.map((h) => ({ ...h, pieces: null, weight_lb: null, shipping_instructions: null })),
        shipment_containers: [],
      });
    }
    // Then fetch full detail with relations
    const nonce = ++fetchNonce.current;
    try {
      const { data: full } = await getShipment(id);
      if (fetchNonce.current !== nonce) return;
      setSheetData(full as ShipmentDetailData | null);
    } catch {
      // Server action can fail when navigating rapidly between shipments;
      // the stale nonce check above ensures only the latest request wins.
    }
  }, [data]);

  const closeSheet = useCallback(() => {
    setSelectedId(null);
  }, []);

  // Arrow key navigation between rows while sheet is open
  useEffect(() => {
    if (!sheetOpen || !selectedId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const idx = filtered.findIndex((s) => s.id === selectedId);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowDown"
        ? Math.min(idx + 1, filtered.length - 1)
        : Math.max(idx - 1, 0);
      if (nextIdx === idx) return;
      const next = filtered[nextIdx];
      if (next) openSheet(next.id);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sheetOpen, selectedId, filtered, openSheet]);

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
              const nextStatus = getNextShipmentStatus(s.modality, s.status);
              const documentNumber = s.awb_number || s.bol_number || s.route_number || "\u2014";
              const isSelected = sheetOpen && s.id === selectedId;
              return (
                <tr
                  key={s.id}
                  className={`border-t border-gray-100 cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
                  onClick={() => openSheet(s.id)}
                >
                  <td className="px-3 py-2.5">
                    <Link href={`/${locale}/shipments/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs font-medium text-gray-900 hover:underline">
                      {s.shipment_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MODALITY_COLORS[s.modality] ?? ""}`}>
                      {MODALITY_LABELS[s.modality] ?? s.modality}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{s.carriers?.name ?? "\u2014"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{documentNumber}</td>
                  <td className="px-3 py-2.5 text-xs">{s.destinations?.city ?? "\u2014"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                    {s.hawbs.length > 0
                      ? s.hawbs.map((h) => h.hawb_number).join(", ")
                      : "\u2014"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{s.total_pieces ?? "\u2014"}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {s.total_weight_lb ? `${s.total_weight_lb} lb` : "\u2014"}
                  </td>
                  <td className="px-3 py-2.5">
                    <ShipmentStatusBadge status={s.status} />
                  </td>
                  {hasActions && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {s.modality === "air" && s.awb_number && (
                          <Link
                            href={`/api/print/mawb/${s.id}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            MAWB
                          </Link>
                        )}
                        {nextStatus && (
                          <button
                            onClick={(e) => { e.stopPropagation(); advance(s.id, s.modality, s.status); }}
                            disabled={isPending}
                            className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            {getShipmentStatusLabel(nextStatus!)}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            }}
          />
        </table>
      </div>

      <ShipmentDetailSheet
        open={sheetOpen}
        onClose={closeSheet}
        shipment={sheetData}
      />
    </div>
  );
}
