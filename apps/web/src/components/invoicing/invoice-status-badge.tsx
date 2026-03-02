"use client";

import { INVOICE_STATUS_LABELS } from "@no-wms/shared/constants/statuses";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  void: "bg-gray-100 text-gray-400 line-through",
};

interface InvoiceStatusBadgeProps {
  status: string;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ""}`}
    >
      {INVOICE_STATUS_LABELS[status as keyof typeof INVOICE_STATUS_LABELS] ?? status}
    </span>
  );
}
