"use client";

import { SHIPMENT_STATUS_LABELS } from "@no-wms/shared/constants/statuses";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  booking_confirmed: "bg-blue-100 text-blue-800",
  cargo_received: "bg-cyan-100 text-cyan-800",
  departed: "bg-indigo-100 text-indigo-800",
  in_transit: "bg-violet-100 text-violet-800",
  vessel_loaded: "bg-teal-100 text-teal-800",
  transhipment: "bg-purple-100 text-purple-800",
  at_port: "bg-orange-100 text-orange-800",
  arrived: "bg-green-100 text-green-800",
  customs_clearance: "bg-yellow-100 text-yellow-800",
  out_for_delivery: "bg-lime-100 text-lime-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

interface ShipmentStatusBadgeProps {
  status: string;
}

export function ShipmentStatusBadge({ status }: ShipmentStatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800"}`}>
      {SHIPMENT_STATUS_LABELS[status as keyof typeof SHIPMENT_STATUS_LABELS] ?? status}
    </span>
  );
}
