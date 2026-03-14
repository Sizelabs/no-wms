"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { TicketMessages } from "@/components/tickets/ticket-messages";
import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { updateTicketStatus } from "@/lib/actions/tickets";
import { formatDate } from "@/lib/format";

interface TicketDetailProps {
  ticket: {
    id: string;
    ticket_number: string;
    subject: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    closed_at: string | null;
    assigned_to: string | null;
    created_by: string;
    agencies: { id: string; name: string; code: string } | null;
    assignee: { full_name: string } | null;
    creator: { full_name: string } | null;
    messages: Array<{
      id: string;
      content: string;
      created_at: string;
      author: { full_name: string } | null;
    }>;
    warehouse_receipts: Array<{
      id: string;
      wr_number: string;
      status: string;
      packages: { tracking_number: string }[];
    }>;
    status_history: Array<{
      id: string;
      old_status: string;
      new_status: string;
      reason: string | null;
      created_at: string;
      changer: { full_name: string } | null;
    }>;
  };
  canManage: boolean;
}

export function TicketDetail({ ticket, canManage }: TicketDetailProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    const reason = newStatus === "closed" ? prompt("Razón de cierre (opcional):") : undefined;
    startTransition(async () => {
      const result = await updateTicketStatus(ticket.id, newStatus, reason ?? undefined);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify(`Estado actualizado a ${newStatus}`, "success");
        router.refresh();
      }
    });
  };

  const canReply = ticket.status !== "closed";

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {ticket.ticket_number}: {ticket.subject}
            </h2>
            <p className="text-sm text-gray-500">
              {ticket.agencies?.name} ({ticket.agencies?.code})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TicketPriorityBadge priority={ticket.priority} />
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="font-medium text-gray-500">Categoría</dt>
            <dd className="mt-0.5 text-gray-900">{ticket.category}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Creado por</dt>
            <dd className="mt-0.5 text-gray-900">{ticket.creator?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Asignado a</dt>
            <dd className="mt-0.5 text-gray-900">{ticket.assignee?.full_name ?? "Sin asignar"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Fecha</dt>
            <dd className="mt-0.5 text-gray-900">
              {formatDate(ticket.created_at)}
            </dd>
          </div>
          {ticket.resolved_at && (
            <div>
              <dt className="font-medium text-gray-500">Resuelto</dt>
              <dd className="mt-0.5 text-gray-900">
                {formatDate(ticket.resolved_at)}
              </dd>
            </div>
          )}
          {ticket.closed_at && (
            <div>
              <dt className="font-medium text-gray-500">Cerrado</dt>
              <dd className="mt-0.5 text-gray-900">
                {formatDate(ticket.closed_at)}
              </dd>
            </div>
          )}
        </dl>

        {/* Description */}
        <div className="mt-4 rounded bg-gray-50 p-3 text-sm text-gray-700">
          <span className="font-medium">Descripción:</span>
          <p className="mt-1 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Related WRs */}
        {ticket.warehouse_receipts.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-500">WRs Relacionados</h4>
            <div className="mt-1 flex flex-wrap gap-2">
              {ticket.warehouse_receipts.map((wr) => (
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

        {/* Status actions */}
        {canManage && ticket.status !== "closed" && (
          <div className="mt-4 flex gap-2 border-t pt-4">
            {ticket.status === "open" && (
              <button
                onClick={() => handleStatusChange("in_review")}
                disabled={isPending}
                className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Iniciar Revisión
              </button>
            )}
            {ticket.status === "in_review" && (
              <button
                onClick={() => handleStatusChange("resolved")}
                disabled={isPending}
                className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Marcar Resuelto
              </button>
            )}
            {(ticket.status === "open" || ticket.status === "in_review" || ticket.status === "resolved") && (
              <button
                onClick={() => handleStatusChange("closed")}
                disabled={isPending}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cerrar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="rounded-lg border bg-white p-6">
        <TicketMessages ticketId={ticket.id} messages={ticket.messages} canReply={canReply} />
      </div>

      {/* Status history */}
      {ticket.status_history.length > 0 && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Historial de Estado</h3>
          <div className="space-y-2">
            {ticket.status_history.map((h) => (
              <div key={h.id} className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">
                  {new Date(h.created_at).toLocaleString("es")}
                </span>
                <span className="text-gray-600">
                  {h.changer?.full_name ?? "Sistema"}
                </span>
                <span className="text-gray-400">:</span>
                <TicketStatusBadge status={h.old_status} />
                <span className="text-gray-400">&rarr;</span>
                <TicketStatusBadge status={h.new_status} />
                {h.reason && <span className="text-gray-500">— {h.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
