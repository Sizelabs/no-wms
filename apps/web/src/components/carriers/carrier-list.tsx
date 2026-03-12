"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";

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

interface Carrier {
  id: string;
  code: string;
  name: string;
  modality: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
}

interface CarrierListProps {
  carriers: Carrier[];
}

export function CarrierList({ carriers }: CarrierListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = carriers.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (modalityFilter.length > 0 && !modalityFilter.includes(c.modality)) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar transportista, código..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todas las modalidades"
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
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Modalidad</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={5}
            emptyMessage="No hay transportistas registrados."
            renderRow={(carrier) => (
              <tr key={carrier.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{carrier.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/${locale}/settings/carriers/${carrier.id}`}
                    className="hover:underline"
                  >
                    {carrier.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MODALITY_COLORS[carrier.modality] ?? ""}`}>
                    {MODALITY_LABELS[carrier.modality] ?? carrier.modality}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {carrier.contact_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${carrier.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {carrier.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            )}
          />
        </table>
      </div>
    </div>
  );
}
