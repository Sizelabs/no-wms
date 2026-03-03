"use client";

import { useState, useTransition } from "react";

import type { WrSummaryItem } from "./service-flow-wrapper";
import { ServiceFlowWrapper } from "./service-flow-wrapper";

import { useNotification } from "@/components/layout/notification";
import { createWorkOrder } from "@/lib/actions/work-orders";

interface PhotosFlowProps {
  open: boolean;
  onClose: () => void;
  wrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
}

const PHOTO_TYPES = [
  { value: "general", label: "General", desc: "Vista general del paquete" },
  { value: "contents", label: "Contenido", desc: "Fotos del contenido al abrir" },
  { value: "labels", label: "Etiquetas", desc: "Close-up de etiquetas y marcas" },
  { value: "damage", label: "Dano", desc: "Documentacion de danos visibles" },
] as const;

export function PhotosFlow({ open, onClose, wrs, warehouseId, agencyId }: PhotosFlowProps) {
  const [photoType, setPhotoType] = useState<string>("");
  const [angleInstructions, setAngleInstructions] = useState("");
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const canSubmit = photoType.length > 0;

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", "photos");
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
      if (angleInstructions) fd.set("instructions", angleInstructions);
      fd.set("metadata", JSON.stringify({
        photo_type: photoType,
        angle_instructions: angleInstructions.trim() || undefined,
      }));

      const result = await createWorkOrder(fd);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Solicitud de fotos creada", "success");
        onClose();
      }
    });
  }

  return (
    <ServiceFlowWrapper
      open={open}
      onClose={onClose}
      title="Fotos"
      size="sm"
      wrs={wrs}
      submitLabel="Solicitar Fotos"
      submitDisabled={!canSubmit}
      submitting={isPending}
      onSubmit={handleSubmit}
    >
      <div>
        <span className="mb-2 block text-sm text-gray-600">
          Tipo de foto <span className="text-red-400">*</span>
        </span>
        <div className="grid grid-cols-2 gap-2">
          {PHOTO_TYPES.map((pt) => (
            <label
              key={pt.value}
              className={`flex cursor-pointer flex-col rounded-lg border p-3 transition-colors ${
                photoType === pt.value
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input type="radio" name="photo_type" value={pt.value} checked={photoType === pt.value} onChange={(e) => setPhotoType(e.target.value)} className="sr-only" />
              <span className="text-sm font-medium text-gray-900">{pt.label}</span>
              <span className="text-xs text-gray-500">{pt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Instrucciones</span>
        <textarea
          value={angleInstructions}
          onChange={(e) => setAngleInstructions(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"
          placeholder="Ej: Fotografiar etiqueta de envio y numero de serie"
        />
      </label>
    </ServiceFlowWrapper>
  );
}
