"use client";

import {
  TICKET_PRIORITY_LABELS,
  type TicketPriority,
} from "@no-wms/shared/constants/statuses";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export function TicketPriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority] ?? "bg-gray-100 text-gray-600"}`}
    >
      {TICKET_PRIORITY_LABELS[priority as TicketPriority] ?? priority}
    </span>
  );
}
