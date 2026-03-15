"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CarrierModal } from "@/components/carriers/carrier-modal";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { InfoField } from "@/components/ui/info-field";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { useModalState } from "@/hooks/use-modal-state";
import { useSheetState } from "@/hooks/use-sheet-state";

interface Modality {
  id: string;
  name: string;
  code: string;
}

interface Carrier {
  id: string;
  code: string;
  name: string;
  modalities: Modality[];
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
}

interface CarrierListProps {
  carriers: Carrier[];
  modalities: Modality[];
  canCreate?: boolean;
  canUpdate?: boolean;
}

export function CarrierList({ carriers, modalities, canCreate = false, canUpdate = false }: CarrierListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const modal = useModalState<Carrier>();

  const filtered = carriers.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (modalityFilter.length > 0) {
      const carrierModalityIds = c.modalities.map((m) => m.id);
      if (!modalityFilter.some((fid) => carrierModalityIds.includes(fid))) return false;
    }
    return true;
  });

  const { selectedId, selectedItem, open, openSheet, closeSheet } = useSheetState(filtered);

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={modal.openCreate}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Transportista
          </button>
        </div>
      )}
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
          options={modalities.map((m) => ({ value: m.id, label: m.name }))}
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
              <th className="px-4 py-3">Modalidades</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={5}
            emptyMessage="No hay transportistas registrados."
            renderRow={(carrier) => {
              const isSelected = open && carrier.id === selectedId;
              return (
              <tr
                key={carrier.id}
                className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
                onClick={() => openSheet(carrier.id)}
              >
                <td className="px-4 py-3 font-mono text-xs">{carrier.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/${locale}/settings/carriers/${carrier.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline"
                  >
                    {carrier.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {carrier.modalities.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                      >
                        {m.name}
                      </span>
                    ))}
                    {carrier.modalities.length === 0 && (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
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
              );
            }}
          />
        </table>
      </div>

      <DetailSheet
        open={open}
        onClose={closeSheet}
        title={selectedItem ? `Transportista ${selectedItem.name}` : "Detalle"}
        detailHref={selectedItem ? `/${locale}/settings/carriers/${selectedItem.id}` : undefined}
        editAction={canUpdate && selectedItem ? () => { modal.openEdit(selectedItem); } : undefined}
      >
        {selectedItem && (
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoField label="Código" value={selectedItem.code} />
            <InfoField label="Nombre" value={selectedItem.name} />
            <InfoField
              label="Modalidades"
              value={selectedItem.modalities.map((m) => m.name).join(", ") || "—"}
            />
            <InfoField label="Contacto" value={selectedItem.contact_name ?? "—"} />
            <InfoField label="Teléfono" value={selectedItem.contact_phone ?? "—"} />
            <InfoField label="Email" value={selectedItem.contact_email ?? "—"} />
            <InfoField label="Estado" value={selectedItem.is_active ? "Activo" : "Inactivo"} />
          </div>
        )}
      </DetailSheet>

      <CarrierModal
        key={modal.editItem?.id ?? "create"}
        open={modal.createOpen || !!modal.editItem}
        onClose={modal.close}
        carrier={modal.editItem}
        modalities={modalities}
      />
    </div>
  );
}
