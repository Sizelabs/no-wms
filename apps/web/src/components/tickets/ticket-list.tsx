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
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("");

  const filtered = data.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (agencyFilter && !t.agencies?.code?.includes(agencyFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border px-2 py-1.5 text-sm text-gray-700"
        >
          <option value="">Todos los estados</option>
          {Object.values(TICKET_STATUSES).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded border px-2 py-1.5 text-sm text-gray-700"
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
            className="rounded border px-2 py-1.5 text-sm text-gray-700"
          >
            <option value="">Todas las agencias</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        )}
      </div>

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
