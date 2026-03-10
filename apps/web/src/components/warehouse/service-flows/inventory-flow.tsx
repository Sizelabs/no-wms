"use client";

import { useState, useTransition } from "react";

import type { WrSummaryItem } from "./service-flow-wrapper";
import { ServiceFlowWrapper } from "./service-flow-wrapper";

import { useNotification } from "@/components/layout/notification";
import { createWorkOrder } from "@/lib/actions/work-orders";

interface InventoryFlowProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
}

const DETAIL_LEVELS = [
  { value: "simple", label: "Simple", desc: "Conteo de items, cantidad registrada" },
  { value: "detailed", label: "Detallado", desc: "Codigos, colores, descripciones, especificaciones" },
] as const;

export function InventoryFlow({ open, onClose, onSuccess, wrs, warehouseId, agencyId }: InventoryFlowProps) {
  const [detailLevel, setDetailLevel] = useState<string>("");
  const [instructions, setInstructions] = useState("");
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const canSubmit = detailLevel.length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", "inventory_count");
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
      if (instructions) fd.set("instructions", instructions);
      fd.set("metadata", JSON.stringify({ detail_level: detailLevel }));

      const result = await createWorkOrder(fd);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Solicitud de inventario creada", "success");
        onSuccess();
      }
    });
  }

  return (
    <ServiceFlowWrapper
      open={open}
      onClose={onClose}
      title="Inventariar"
      size="sm"
      wrs={wrs}
      submitLabel="Solicitar Inventario"
      submitDisabled={!canSubmit}
      submitting={isPending}
      onSubmit={handleSubmit}
    >
      <div>
        <span className="mb-2 block text-sm text-gray-600">
          Nivel de detalle <span className="text-red-400">*</span>
        </span>
        <div className="grid grid-cols-2 gap-2">
          {DETAIL_LEVELS.map((level) => (
            <label
              key={level.value}
              className={`flex cursor-pointer flex-col rounded-lg border p-3 transition-colors ${
                detailLevel === level.value
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input type="radio" name="detail_level" value={level.value} checked={detailLevel === level.value} onChange={(e) => setDetailLevel(e.target.value)} className="sr-only" />
              <span className="text-sm font-medium text-gray-900">{level.label}</span>
              <span className="text-xs text-gray-500">{level.desc}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Instrucciones</span>
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
