"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ForwarderModal } from "@/components/forwarders/forwarder-modal";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { InfoField } from "@/components/ui/info-field";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { useModalState } from "@/hooks/use-modal-state";
import { useSheetState } from "@/hooks/use-sheet-state";
import { formatDate } from "@/lib/format";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

interface ForwarderListProps {
  forwarders: Organization[];
  counts: Record<string, { warehouses: number; agencies: number; users: number }>;
  canCreate?: boolean;
  canUpdate?: boolean;
}

export function ForwarderList({ forwarders, counts, canCreate = false, canUpdate = false }: ForwarderListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const modal = useModalState<Organization>();
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = forwarders.filter((f) => {
    if (search) {
      const q = search.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q);
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
            + Nuevo Freight Forwarder
          </button>
        </div>
      )}
      {/* Search row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar freight forwarder, slug..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
      </div>

    <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Freight Forwarder</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Bodegas</th>
            <th className="px-4 py-3">Agencias</th>
            <th className="px-4 py-3">Usuarios</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <VirtualTableBody
          items={filtered}
          scrollElement={scrollEl}
          colSpan={6}
          emptyMessage="No hay freight forwarders registrados."
          renderRow={(fwd) => {
            const c = counts[fwd.id] ?? {
              warehouses: 0,
              agencies: 0,
              users: 0,
            };
            const isSelected = open && fwd.id === selectedId;
            return (
              <tr
                key={fwd.id}
                className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
                onClick={() => openSheet(fwd.id)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {fwd.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {fwd.slug}
                </td>
                <td className="px-4 py-3 text-gray-600">{c.warehouses}</td>
                <td className="px-4 py-3 text-gray-600">{c.agencies}</td>
                <td className="px-4 py-3 text-gray-600">{c.users}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/${locale}/settings/forwarders/${fwd.id}`}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver detalle
                  </Link>
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
      title={selectedItem?.name ?? ""}
      detailHref={selectedItem ? `/${locale}/settings/forwarders/${selectedItem.id}` : undefined}
      editAction={canUpdate && selectedItem ? () => { closeSheet(); modal.openEdit(selectedItem); } : undefined}
    >
      {selectedItem && (
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoField label="Nombre" value={selectedItem.name} />
          <InfoField label="Slug" value={selectedItem.slug} />
          <InfoField label="Creada" value={formatDate(selectedItem.created_at)} />
          <InfoField label="Bodegas" value={counts[selectedItem.id]?.warehouses ?? 0} />
          <InfoField label="Agencias" value={counts[selectedItem.id]?.agencies ?? 0} />
          <InfoField label="Usuarios" value={counts[selectedItem.id]?.users ?? 0} />
        </div>
      )}
    </DetailSheet>

    <ForwarderModal
      key={modal.editItem?.id ?? "create"}
      open={modal.createOpen || !!modal.editItem}
      onClose={modal.close}
      forwarder={modal.editItem}
    />
    </div>
  );
}
