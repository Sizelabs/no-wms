"use client";

import type { AgencyType } from "@no-wms/shared/constants/agency-types";
import { AGENCY_TYPE_LABELS } from "@no-wms/shared/constants/agency-types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AgencyModal } from "@/components/agencies/agency-modal";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { InfoField } from "@/components/ui/info-field";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { useDetailFetch } from "@/hooks/use-detail-fetch";
import { useModalState } from "@/hooks/use-modal-state";
import { useSheetState } from "@/hooks/use-sheet-state";
import { getAgency } from "@/lib/actions/agencies";

interface Agency {
  id: string;
  name: string;
  code: string;
  type: AgencyType;
  is_active: boolean;
  agency_destinations: {
    is_home: boolean;
    destinations: { city: string; country_code: string } | null;
  }[] | null;
}

interface AgencyListProps {
  agencies: Agency[];
  canCreate?: boolean;
  canUpdate?: boolean;
}

function getHomeDestination(agency: Agency): string {
  const home = agency.agency_destinations?.find((d) => d.is_home)?.destinations;
  return home ? `${home.city}, ${home.country_code}` : "\u2014";
}

export function AgencyList({ agencies, canCreate = false, canUpdate = false }: AgencyListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const modal = useModalState<Agency>();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = agencies.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      const homeDestination = a.agency_destinations?.find((d) => d.is_home)?.destinations;
      const matches =
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        homeDestination?.city?.toLowerCase().includes(q) ||
        homeDestination?.country_code?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter.length > 0) {
      const isActive = statusFilter.includes("active");
      const isInactive = statusFilter.includes("inactive");
      if (isActive && !isInactive && !a.is_active) return false;
      if (isInactive && !isActive && a.is_active) return false;
    }
    return true;
  });

  const { selectedId, selectedItem, open, openSheet, closeSheet } = useSheetState(filtered);

  const detailData = useDetailFetch(selectedId, getAgency);

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={modal.openCreate}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Agencia
          </button>
        </div>
      )}
      {/* Search + status row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar agencia, código, país..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todos los estados"
          options={[
            { value: "active", label: "Activa" },
            { value: "inactive", label: "Inactiva" },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

    <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Identificador</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">País Destino</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <VirtualTableBody
          items={filtered}
          scrollElement={scrollEl}
          colSpan={6}
          emptyMessage="No hay agencias registradas."
          renderRow={(agency) => {
            const isSelected = open && agency.id === selectedId;
            return (
            <tr
              key={agency.id}
              className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
              onClick={() => openSheet(agency.id)}
            >
              <td className="px-4 py-3 font-mono text-xs">{agency.code}</td>
              <td className="px-4 py-3 font-medium text-gray-900">
                <Link
                  href={`/${locale}/agencies/${agency.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  {agency.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    agency.type === "corporativo"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {AGENCY_TYPE_LABELS[agency.type]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {getHomeDestination(agency)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    agency.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {agency.is_active ? "Activa" : "Inactiva"}
                </span>
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <Link
                  href={`/${locale}/agencies/${agency.id}`}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
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
        title={selectedItem ? `Agencia ${selectedItem.name}` : "Detalle"}
        detailHref={selectedItem ? `/${locale}/agencies/${selectedItem.id}` : undefined}
        editAction={canUpdate && selectedItem && detailData ? () => {
          closeSheet();
          modal.openEdit({ ...selectedItem, ...detailData } as Agency & typeof detailData);
        } : undefined}
      >
        {selectedItem && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoField label="Código" value={selectedItem.code} />
              <InfoField label="Nombre" value={selectedItem.name} />
              <InfoField label="Tipo" value={AGENCY_TYPE_LABELS[selectedItem.type]} />
              <InfoField label="Courier" value={detailData?.couriers ? `${detailData.couriers.name} (${detailData.couriers.code})` : null} />
              <InfoField label="País Destino" value={getHomeDestination(selectedItem)} />
              <InfoField label="Estado" value={selectedItem.is_active ? "Activa" : "Inactiva"} />
            </div>
            {detailData && (
              <>
                <div className="border-t pt-4">
                  <h3 className="mb-3 text-xs font-medium uppercase text-gray-500">Información de contacto</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoField label="RUC" value={detailData.ruc} />
                    <InfoField label="Teléfono" value={detailData.phone} />
                    <InfoField label="Email" value={detailData.email} />
                    <InfoField label="Dirección" value={detailData.address} />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="mb-3 text-xs font-medium uppercase text-gray-500">Configuración</h3>
                  <InfoField label="Múltiples paquetes por recibo" value={detailData.allow_multi_package ? "Sí" : "No"} />
                </div>
                {detailData.agency_contacts && detailData.agency_contacts.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="mb-3 text-xs font-medium uppercase text-gray-500">
                      Contactos ({detailData.agency_contacts.length})
                    </h3>
                    <div className="space-y-2">
                      {detailData.agency_contacts.map((contact: { id: string; name: string; phone: string | null; email: string | null; role: string | null }) => (
                        <div key={contact.id} className="rounded-md border p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{contact.name}</span>
                            {contact.role && <span className="text-xs text-gray-500">{contact.role}</span>}
                          </div>
                          <div className="mt-1 flex gap-3 text-xs text-gray-500">
                            {contact.phone && <span>{contact.phone}</span>}
                            {contact.email && <span>{contact.email}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </DetailSheet>

      <AgencyModal
        key={modal.editItem?.id ?? "create"}
        open={modal.createOpen || !!modal.editItem}
        onClose={modal.close}
        agency={modal.editItem as Parameters<typeof AgencyModal>[0]["agency"]}
      />
    </div>
  );
}
