"use client";

import { useState, useTransition } from "react";

import type { WrSummaryItem } from "./service-flow-wrapper";
import { ServiceFlowWrapper } from "./service-flow-wrapper";

import { useNotification } from "@/components/layout/notification";
import { createWorkOrder } from "@/lib/actions/work-orders";

interface RepackFlowProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
}

export function RepackFlow({ open, onClose, onSuccess, wrs, warehouseId, agencyId }: RepackFlowProps) {
  const [instructions, setInstructions] = useState("");
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", "repack");
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
      if (instructions.trim()) fd.set("instructions", instructions.trim());

      const result = await createWorkOrder(fd);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Solicitud de reempaque creada", "success");
        onSuccess();
      }
    });
  }

  return (
    <ServiceFlowWrapper
      open={open}
      onClose={onClose}
      title="Reempacar"
      size="sm"
      wrs={wrs}
      submitLabel="Solicitar Reempaque"
      submitting={isPending}
      onSubmit={handleSubmit}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Instrucciones especiales</span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"
          placeholder="Ej: Quitar caja original, envolver en plastico burbuja"
        />
      </label>
    </ServiceFlowWrapper>
  );
}
