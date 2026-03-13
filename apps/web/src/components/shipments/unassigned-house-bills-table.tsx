"use client";

import { useMemo, useState } from "react";

import { SiActionBar } from "@/components/shipping/si-action-bar";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { getShipmentModality } from "@/lib/shipping-utils";

function unwrap<T>(val: T | T[] | null): T | null {
  if (val == null) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

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

interface UnassignedSIRow {
  id: string;
  si_number: string;
  modality: string;
  modalities: any;
  agency_id: string;
  agencies: any;
  destination_id: string | null;
  total_pieces: number | null;
  total_billable_weight_lb: number | null;
  created_at: string;
  shipping_instruction_items: any[];
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Destination {
  id: string;
  city: string;
  country_code: string;
}

interface Carrier {
  id: string;
  code: string;
  name: string;
  modality: string;
}

interface Agency {
  id: string;
  name: string;
  code: string;
}

interface UnassignedHouseBillsTableProps {
  data: UnassignedSIRow[];
  warehouses: Warehouse[];
  destinations: Destination[];
  carriers: Carrier[];
  agencies: Agency[];
  orgName?: string;
}

export function UnassignedHouseBillsTable({
  data,
  warehouses,
  destinations,
  carriers,
  agencies,
  orgName,
}: UnassignedHouseBillsTableProps) {
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    return data.filter((si) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          si.si_number.toLowerCase().includes(q) ||
          unwrap(si.agencies)?.name.toLowerCase().includes(q) ||
          unwrap(si.agencies)?.code.toLowerCase().includes(q) ||
          si.shipping_instruction_items.some((item) =>
            item.warehouse_receipts?.wr_number.toLowerCase().includes(q),
          );
        if (!matches) return false;
      }
      if (modalityFilter.length > 0) {
        const shipModality = getShipmentModality(unwrap(si.modalities)?.code ?? si.modality);
        if (!modalityFilter.includes(shipModality)) return false;
      }
      return true;
    });
  }, [data, search, modalityFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((si) => selected.has(si.id));

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const si of filtered) next.delete(si.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const si of filtered) next.add(si.id);
        return next;
      });
    }
  };

  // Build selected SIs for the action bar
  const selectedSIs = data
    .filter((si) => selected.has(si.id))
    .map((si) => ({
      id: si.id,
      si_number: si.si_number,
      modality_code: unwrap(si.modalities)?.code ?? si.modality,
      agency_id: si.agency_id,
      agency_name: unwrap(si.agencies)?.name ?? undefined,
      destination_id: si.destination_id ?? undefined,
    }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por SI, agencia, recibo..."
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
      </div>

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={handleToggleAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-3">SI #</th>
              <th className="px-3 py-3">Modalidad</th>
              <th className="px-3 py-3">Agencia</th>
              <th className="px-3 py-3">WRs</th>
              <th className="px-3 py-3">Peso</th>
              <th className="px-3 py-3">Fecha</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={7}
            emptyMessage="No hay SIs finalizadas sin asignar"
            renderRow={(si) => {
              const isSelected = selected.has(si.id);
              const items = si.shipping_instruction_items ?? [];
              const wrNumbers = items
                .map((item) => item.warehouse_receipts?.wr_number)
                .filter(Boolean);
              const modalityCode = unwrap(si.modalities)?.code ?? si.modality;
              const shipModality = getShipmentModality(modalityCode);

              return (
                <tr
                  key={si.id}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  onClick={() => handleToggle(si.id)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(si.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-900">
                    {si.si_number}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MODALITY_COLORS[shipModality] ?? ""}`}>
                      {MODALITY_LABELS[shipModality] ?? unwrap(si.modalities)?.name ?? si.modality}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {unwrap(si.agencies)?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {wrNumbers.length > 0 ? wrNumbers.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {si.total_billable_weight_lb ? `${Number(si.total_billable_weight_lb).toFixed(1)} lb` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">
                    {new Date(si.created_at).toLocaleDateString("es")}
                  </td>
                </tr>
              );
            }}
          />
        </table>
      </div>

      <SiActionBar
        selectedSIs={selectedSIs}
        onClearSelection={() => setSelected(new Set())}
        warehouses={warehouses}
        destinations={destinations}
        carriers={carriers}
        agencies={agencies}
        orgName={orgName}
      />
    </div>
  );
}
