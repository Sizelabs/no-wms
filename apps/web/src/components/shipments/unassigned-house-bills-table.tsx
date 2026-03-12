"use client";

import { useMemo, useState } from "react";

import { HouseBillActionBar } from "./house-bill-action-bar";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";

const DOC_TYPE_LABELS: Record<string, string> = {
  hawb: "HAWB",
  hbl: "HBL",
  hwb: "HWB",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  hawb: "bg-sky-50 text-sky-700",
  hbl: "bg-blue-50 text-blue-700",
  hwb: "bg-amber-50 text-amber-700",
};

interface ShippingInstructionItem {
  warehouse_receipt_id: string;
  warehouse_receipts: {
    wr_number: string;
    packages: Array<{ tracking_number: string }>;
  } | null;
}

interface HouseBillRow {
  id: string;
  hawb_number: string;
  document_type: string;
  created_at: string;
  shipping_instructions: {
    si_number: string;
    agency_id: string;
    agencies: { name: string; code: string } | null;
    shipping_instruction_items: ShippingInstructionItem[];
  } | null;
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
  data: HouseBillRow[];
  warehouses: Warehouse[];
  destinations: Destination[];
  carriers: Carrier[];
  agencies: Agency[];
}

export function UnassignedHouseBillsTable({
  data,
  warehouses,
  destinations,
  carriers,
  agencies,
}: UnassignedHouseBillsTableProps) {
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    return data.filter((hb) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          hb.hawb_number.toLowerCase().includes(q) ||
          hb.shipping_instructions?.si_number.toLowerCase().includes(q) ||
          hb.shipping_instructions?.agencies?.name.toLowerCase().includes(q) ||
          hb.shipping_instructions?.shipping_instruction_items.some((item) =>
            item.warehouse_receipts?.wr_number.toLowerCase().includes(q),
          );
        if (!matches) return false;
      }
      if (docTypeFilter.length > 0 && !docTypeFilter.includes(hb.document_type)) return false;
      return true;
    });
  }, [data, search, docTypeFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((hb) => selected.has(hb.id));

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
        for (const hb of filtered) next.delete(hb.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const hb of filtered) next.add(hb.id);
        return next;
      });
    }
  };

  const selectedHouseBills = data
    .filter((hb) => selected.has(hb.id))
    .map((hb) => ({ id: hb.id, hawb_number: hb.hawb_number, document_type: hb.document_type }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por guía, SI, agencia, recibo..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Tipo"
          options={[
            { value: "hawb", label: "HAWB" },
            { value: "hbl", label: "HBL" },
            { value: "hwb", label: "HWB" },
          ]}
          selected={docTypeFilter}
          onChange={setDocTypeFilter}
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
              <th className="px-3 py-3">Guía #</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">SI #</th>
              <th className="px-3 py-3">Agencia</th>
              <th className="px-3 py-3">Recibos</th>
              <th className="px-3 py-3">Fecha</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={7}
            emptyMessage="No hay guías sin asignar"
            renderRow={(hb) => {
              const isSelected = selected.has(hb.id);
              const items = hb.shipping_instructions?.shipping_instruction_items ?? [];
              const wrNumbers = items
                .map((item) => item.warehouse_receipts?.wr_number)
                .filter(Boolean);
              const totalPackages = items.reduce(
                (sum, item) => sum + (item.warehouse_receipts?.packages?.length ?? 0),
                0,
              );

              return (
                <tr
                  key={hb.id}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  onClick={() => handleToggle(hb.id)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(hb.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-900">
                    {hb.hawb_number}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${DOC_TYPE_COLORS[hb.document_type] ?? ""}`}>
                      {DOC_TYPE_LABELS[hb.document_type] ?? hb.document_type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                    {hb.shipping_instructions?.si_number ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {hb.shipping_instructions?.agencies?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {wrNumbers.length > 0 ? (
                      <span>
                        {wrNumbers.join(", ")}
                        {totalPackages > 0 && (
                          <span className="ml-1 text-gray-400">({totalPackages} paq.)</span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">
                    {new Date(hb.created_at).toLocaleDateString("es")}
                  </td>
                </tr>
              );
            }}
          />
        </table>
      </div>

      <HouseBillActionBar
        selectedHouseBills={selectedHouseBills}
        onClearSelection={() => setSelected(new Set())}
        warehouses={warehouses}
        destinations={destinations}
        carriers={carriers}
        agencies={agencies}
      />
    </div>
  );
}
