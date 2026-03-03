"use client";

import { useState, useTransition } from "react";

import type { WrSummaryItem } from "./service-flow-wrapper";
import { ServiceFlowWrapper } from "./service-flow-wrapper";

import { useNotification } from "@/components/layout/notification";
import { createWorkOrder } from "@/lib/actions/work-orders";

interface InspectionFlowProps {
  open: boolean;
  onClose: () => void;
  wrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
}

export function InspectionFlow({ open, onClose, wrs, warehouseId, agencyId }: InspectionFlowProps) {
  const [inspectionFocus, setInspectionFocus] = useState("");
  const [checkDgr, setCheckDgr] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", "inspection");
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
      if (instructions) fd.set("instructions", instructions);
      fd.set("metadata", JSON.stringify({
        inspection_focus: inspectionFocus.trim() || undefined,
        check_for_dgr: checkDgr,
      }));

      const result = await createWorkOrder(fd);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Solicitud de inspeccion creada", "success");
        onClose();
      }
    });
  }

  return (
    <ServiceFlowWrapper
      open={open}
      onClose={onClose}
      title="Inspeccionar"
      size="sm"
      wrs={wrs}
      submitLabel="Solicitar Inspeccion"
      submitting={isPending}
      onSubmit={handleSubmit}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Enfoque de inspeccion</span>
        <textarea
          value={inspectionFocus}
          onChange={(e) => setInspectionFocus(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"
          placeholder="Ej: Verificar integridad del producto, revisar sellos"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
        <input
          type="checkbox"
          checked={checkDgr}
          onChange={(e) => setCheckDgr(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
        />
        Verificar mercancias peligrosas (DGR)
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
