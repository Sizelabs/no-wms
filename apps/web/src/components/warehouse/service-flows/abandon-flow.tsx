"use client";

import { useState, useTransition } from "react";

import type { WrSummaryItem } from "./service-flow-wrapper";
import { ServiceFlowWrapper } from "./service-flow-wrapper";

import { useNotification } from "@/components/layout/notification";
import { createWorkOrder } from "@/lib/actions/work-orders";

interface AbandonFlowProps {
  open: boolean;
  onClose: () => void;
  wrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
}

export function AbandonFlow({ open, onClose, wrs, warehouseId, agencyId }: AbandonFlowProps) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const isConfirmed = confirmation === "ABANDONAR";

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", "abandon");
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
      if (reason) fd.set("instructions", reason);
      fd.set("metadata", JSON.stringify({ confirmation_text: confirmation }));

      const result = await createWorkOrder(fd);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Solicitud de abandono creada", "success");
        onClose();
      }
    });
  }

  return (
    <ServiceFlowWrapper
      open={open}
      onClose={onClose}
      title="Abandonar"
      size="sm"
      wrs={wrs}
      submitLabel="Confirmar Abandono"
      submitDisabled={!isConfirmed}
      submitting={isPending}
      onSubmit={handleSubmit}
      variant="destructive"
    >
      <p className="text-sm text-red-600">
        Esta accion es irreversible. Los paquetes seran descartados permanentemente.
      </p>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Razon</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"
          placeholder="Razon del abandono..."
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">
          Escriba <span className="font-mono font-semibold text-gray-900">ABANDONAR</span> para confirmar
        </span>
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-400 focus:ring-1 focus:ring-red-400 focus:outline-none transition-colors"
          placeholder="ABANDONAR"
        />
      </label>
    </ServiceFlowWrapper>
  );
}
