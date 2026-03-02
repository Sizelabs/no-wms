"use client";

import {
  TICKET_STATUS_LABELS,
  type TicketStatus,
} from "@no-wms/shared/constants/statuses";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {TICKET_STATUS_LABELS[status as TicketStatus] ?? status}
    </span>
  );
}
