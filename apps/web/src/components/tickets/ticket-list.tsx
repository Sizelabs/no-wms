"use client";

import { TICKET_STATUSES } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { useState } from "react";

import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";

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
}

export function TicketList({ data, agencies }: TicketListProps) {
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

  const activeFilterCount = [priorityFilter, agencyFilter].filter((f) => f.length > 0).length;

  return (
    <div className="space-y-3">
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
            renderRow={(ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="font-mono text-xs font-medium text-blue-600 hover:underline"
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
                  {new Date(ticket.created_at).toLocaleDateString("es")}
                </td>
              </tr>
            )}
          />
        </table>
      </div>
    </div>
  );
}
