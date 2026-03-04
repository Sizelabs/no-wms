"use client";

import { TICKET_STATUSES } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { useState } from "react";

import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";

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
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (agencyFilter && !t.agencies?.name?.includes(agencyFilter)) return false;
    return true;
  });

  const activeFilterCount = [priorityFilter, agencyFilter].filter(Boolean).length;

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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.values(TICKET_STATUSES).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-md border px-3 py-2 text-sm ${
            activeFilterCount > 0
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-md border bg-gray-50 p-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todas las prioridades</option>
            <option value="low">Baja</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
          {agencies && agencies.length > 0 && (
            <select
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="">Todas las agencias</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setPriorityFilter("");
                setAgencyFilter("");
              }}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
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
          <tbody className="divide-y">
            {filtered.map((ticket) => (
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
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">
                  No hay tickets
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
