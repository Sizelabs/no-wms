"use client";

import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { DestinationCoverageModal } from "@/components/settings/destination-coverage-modal";
import { DestinationModal } from "@/components/settings/destination-modal";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { useModalState } from "@/hooks/use-modal-state";
import { deleteDestination } from "@/lib/actions/destinations";

interface DestinationRow {
  id: string;
  city: string;
  state: string | null;
  country_code: string;
  country_name: string | null;
  currency: string;
  is_active: boolean;
}

interface ModalityInfo {
  id: string;
  name: string;
  code: string;
}

interface CourierWithDestinations {
  id: string;
  name: string;
  organization_id: string;
  courier_destinations: { destination_id: string; modality_id: string; is_active: boolean }[];
}

interface DestinationListProps {
  data: DestinationRow[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  couriers?: CourierWithDestinations[];
  modalities?: ModalityInfo[];
}

function formatLocation(d: DestinationRow): string {
  return [d.city, d.state, d.country_name ?? d.country_code].filter(Boolean).join(", ");
}

export function DestinationList({ data, canCreate = false, canUpdate = false, canDelete = false, couriers = [], modalities = [] }: DestinationListProps) {
  const hasActions = canUpdate || canDelete;
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const modal = useModalState<DestinationRow>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [coverageDestination, setCoverageDestination] = useState<DestinationRow | null>(null);

  const filtered = data.filter((d) => {
    if (search) {
      const q = search.toLowerCase();
      const location = formatLocation(d).toLowerCase();
      if (!location.includes(q)) return false;
    }
    if (statusFilter.length > 0) {
      const isActive = d.is_active ? "active" : "inactive";
      if (!statusFilter.includes(isActive)) return false;
    }
    return true;
  });

  const handleDeactivate = (id: string) => {
    if (!confirm("¿Desactivar este destino?")) return;
    startTransition(async () => {
      const result = await deleteDestination(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Destino desactivado", "success");
      }
    });
  };

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={modal.openCreate}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Destino
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar destino..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todos los estados"
          options={[
            { value: "active", label: "Activos" },
            { value: "inactive", label: "Inactivos" },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-280px)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Moneda</th>
              <th className="px-4 py-3">Estado</th>
              {hasActions && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={hasActions ? 4 : 3}
            emptyMessage="No hay destinos registrados."
            renderRow={(d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{formatLocation(d)}</td>
                <td className="px-4 py-3 text-gray-600">{d.currency}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      d.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {d.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {hasActions && (
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {canUpdate && (
                      <>
                        <button
                          onClick={() => modal.openEdit(d)}
                          className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setCoverageDestination(d)}
                          className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Cobertura
                        </button>
                      </>
                    )}
                    {canDelete && d.is_active && (
                      <button
                        onClick={() => handleDeactivate(d.id)}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </td>
                )}
              </tr>
            )}
          />
        </table>
      </div>

      <DestinationModal
        key={modal.editItem?.id ?? "create"}
        open={modal.createOpen || !!modal.editItem}
        onClose={modal.close}
        destination={modal.editItem}
      />

      {coverageDestination && (
        <DestinationCoverageModal
          key={coverageDestination.id}
          open={!!coverageDestination}
          onClose={() => setCoverageDestination(null)}
          destinationId={coverageDestination.id}
          destinationLabel={formatLocation(coverageDestination)}
          couriers={couriers}
          modalities={modalities}
        />
      )}
    </div>
  );
}
