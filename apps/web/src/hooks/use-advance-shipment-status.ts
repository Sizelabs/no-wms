import type { ShipmentModality, ShipmentStatus } from "@no-wms/shared/constants/statuses";

import { SHIPMENT_STATUS_FLOW, SHIPMENT_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { updateShipmentStatus } from "@/lib/actions/shipments";

export function getNextShipmentStatus(modality: string, status: string): string | undefined {
  const flow = SHIPMENT_STATUS_FLOW[modality as ShipmentModality];
  return flow?.[status as ShipmentStatus];
}

export function getShipmentStatusLabel(status: string): string {
  return SHIPMENT_STATUS_LABELS[status as ShipmentStatus] ?? status;
}

export function useAdvanceShipmentStatus() {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  const advance = (id: string, modality: string, currentStatus: string) => {
    const next = getNextShipmentStatus(modality, currentStatus);
    if (!next) return;
    startTransition(async () => {
      const res = await updateShipmentStatus(id, next);
      if (res.error) {
        notify(res.error, "error");
      } else {
        notify(`Embarque actualizado a ${SHIPMENT_STATUS_LABELS[next as ShipmentStatus] ?? next}`, "success");
      }
    });
  };

  return { advance, isPending };
}
