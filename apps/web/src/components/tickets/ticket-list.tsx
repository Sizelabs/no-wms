"use client";

import { TICKET_STATUSES } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { TicketModal } from "@/components/tickets/ticket-modal";
import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { InfoField } from "@/components/ui/info-field";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { useSheetState } from "@/hooks/use-sheet-state";
import { getTicket } from "@/lib/actions/tickets";
import { formatDate } from "@/lib/format";

interface TicketRow {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  assigned_to: string | null;
  agencies: { name: string; code: string } | null;
  creator: { full_name: string } | null;
}

interface TicketListProps {
  data: TicketRow[];
  agencies?: Array<{ id: string; name: string }>;
  canCreate?: boolean;
  agencyId?: string;
}

export function TicketList({ data, agencies, canCreate = false, agencyId }: TicketListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [agencyFilter, setAgencyFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = data.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        t.ticket_number.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.agencies?.name?.toLowerCase().includes(q) ||
        t.creator?.full_name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter.length > 0 && !statusFilter.includes(t.status)) return false;
    if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) return false;
    if (agencyFilter.length > 0 && (!t.agencies?.name || !agencyFilter.includes(t.agencies.name))) return false;
    return true;
  });

  const { selectedId, selectedItem, open, openSheet, closeSheet } = useSheetState(filtered);

  const [detailData, setDetailData] = useState<{
    description: string;
    assigned_to: string | null;
    resolved_at: string | null;
    closed_at: string | null;
    assignee: { full_name: string } | null;
    warehouse_receipts: { id: string; wr_number: string; packages: { tracking_number: string }[] }[];
  } | null>(null);
  const fetchNonce = useRef(0);

  useEffect(() => {
    if (!selectedId) { setDetailData(null); return; }
    const nonce = ++fetchNonce.current;
    getTicket(selectedId).then(({ data }) => {
      if (fetchNonce.current !== nonce) return;
      setDetailData(data as typeof detailData);
    });
  }, [selectedId]);

  const activeFilterCount = [priorityFilter, agencyFilter].filter((f) => f.length > 0).length;

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Ticket
          </button>
        </div>
      )}
      {/* Search + primary filter row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ticket, asunto, agencia..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todos los estados"
          options={Object.values(TICKET_STATUSES).map((s) => ({ value: s, label: s }))}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-md border px-3 py-2 text-sm ${
            activeFilterCount > 0
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filtros<span className={`transition-opacity ${activeFilterCount > 0 ? "opacity-100" : "opacity-0"}`}>{` (${Math.max(activeFilterCount, 1)})`}</span>
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-md border bg-gray-50 p-3">
          <MultiSelectFilter
            label="Todas las prioridades"
            options={[
              { value: "low", label: "Baja" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "Alta" },
              { value: "urgent", label: "Urgente" },
            ]}
            selected={priorityFilter}
            onChange={setPriorityFilter}
          />
          {agencies && agencies.length > 0 && (
            <MultiSelectFilter
              label="Todas las agencias"
              options={agencies.map((a) => ({ value: a.name, label: a.name }))}
              selected={agencyFilter}
              onChange={setAgencyFilter}
            />
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setPriorityFilter([]);
                setAgencyFilter([]);
              }}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Ticket #</th>
              <th className="px-4 py-3">Asunto</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={7}
            emptyMessage="No hay tickets"
            renderRow={(ticket) => {
              const isSelected = open && ticket.id === selectedId;
              return (
                <tr
                  key={ticket.id}
                  className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
                  onClick={() => openSheet(ticket.id)}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-mono text-xs font-medium text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ticket.ticket_number}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs">{ticket.subject}</td>
                  <td className="px-4 py-3 text-xs">
                    {ticket.agencies ? `${ticket.agencies.name}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{ticket.category}</td>
                  <td className="px-4 py-3">
                    <TicketPriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(ticket.created_at)}
                  </td>
                </tr>
              );
            }}
          />
        </table>
      </div>

      {/* Detail drawer */}
      <DetailSheet
        open={open}
        onClose={closeSheet}
        title={selectedItem ? `Ticket ${selectedItem.ticket_number}` : ""}
        detailHref={selectedItem ? `/tickets/${selectedItem.id}` : undefined}
      >
        {selectedItem && (
          <>
            <div className="flex flex-wrap gap-2">
              <TicketStatusBadge status={selectedItem.status} />
              <TicketPriorityBadge priority={selectedItem.priority} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Ticket #" value={selectedItem.ticket_number} />
              <InfoField label="Asunto" value={selectedItem.subject} />
              <InfoField label="Categoría" value={selectedItem.category} />
              <InfoField label="Agencia" value={selectedItem.agencies?.name} />
              <InfoField label="Creado por" value={selectedItem.creator?.full_name} />
              <InfoField label="Asignado a" value={detailData?.assignee?.full_name ?? selectedItem.assigned_to} />
              <InfoField label="Fecha" value={formatDate(selectedItem.created_at)} />
              {detailData?.resolved_at && (
                <InfoField label="Resuelto" value={formatDate(detailData.resolved_at)} />
              )}
              {detailData?.closed_at && (
                <InfoField label="Cerrado" value={formatDate(detailData.closed_at)} />
              )}
            </div>
            {detailData?.description && (
              <div className="border-t pt-4">
                <h3 className="mb-2 text-xs font-medium uppercase text-gray-500">Descripción</h3>
                <p className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-700">{detailData.description}</p>
              </div>
            )}
            {detailData?.warehouse_receipts && detailData.warehouse_receipts.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="mb-2 text-xs font-medium uppercase text-gray-500">WRs Relacionados</h3>
                <div className="flex flex-wrap gap-2">
                  {detailData.warehouse_receipts.map((wr) => (
                    <span
                      key={wr.id}
                      className="inline-flex items-center gap-1 rounded border bg-gray-50 px-2 py-0.5 font-mono text-xs"
                    >
                      {wr.wr_number}
                      <span className="text-gray-400">({wr.packages?.[0]?.tracking_number ?? ""})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DetailSheet>

      <TicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        agencyId={agencyId}
      />
    </div>
  );
}
