"use client";

import { useState, useTransition } from "react";

import type { WrSummaryItem } from "./service-flow-wrapper";
import { ServiceFlowWrapper } from "./service-flow-wrapper";

import { useNotification } from "@/components/layout/notification";
import { createWorkOrder } from "@/lib/actions/work-orders";

interface DivideFlowProps {
  open: boolean;
  onClose: () => void;
  wrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
}

export function DivideFlow({ open, onClose, wrs, warehouseId, agencyId }: DivideFlowProps) {
  const [splitCount, setSplitCount] = useState(2);
  const [splitInstructions, setSplitInstructions] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const canSubmit = splitCount >= 2 && splitCount <= 50 && splitInstructions.trim().length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", "divide");
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
      if (instructions) fd.set("instructions", instructions);
      fd.set("metadata", JSON.stringify({
        split_count: splitCount,
        split_instructions: splitInstructions.trim() || undefined,
      }));

      const result = await createWorkOrder(fd);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Solicitud de division creada", "success");
        onClose();
      }
    });
  }

  return (
    <ServiceFlowWrapper
      open={open}
      onClose={onClose}
      title="Dividir"
      size="sm"
      wrs={wrs}
      submitLabel="Solicitar Division"
      submitDisabled={!canSubmit}
      submitting={isPending}
      onSubmit={handleSubmit}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">
          Cantidad de partes <span className="text-red-400">*</span>
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={2}
            max={50}
            value={splitCount}
            onChange={(e) => setSplitCount(Number(e.target.value))}
            className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"
          />
          <span className="text-xs text-gray-400">2 – 50</span>
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">
          Instrucciones de division <span className="text-red-400">*</span>
        </span>
        <textarea
          value={splitInstructions}
          onChange={(e) => setSplitInstructions(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"
          placeholder="Ej: 2 camisas en paquete 1, el resto en paquete 2"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Instrucciones generales</span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"
        />
      </label>
    </ServiceFlowWrapper>
  );
}
