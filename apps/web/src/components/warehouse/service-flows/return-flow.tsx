"use client";

import { useCallback, useState, useTransition } from "react";

import type { WrSummaryItem } from "./service-flow-wrapper";
import { ServiceFlowWrapper } from "./service-flow-wrapper";

import { useNotification } from "@/components/layout/notification";
import type { UploadedFile } from "@/components/ui/file-upload";
import { FileUpload } from "@/components/ui/file-upload";
import { createWorkOrder } from "@/lib/actions/work-orders";

interface ReturnFlowProps {
  open: boolean;
  onClose: () => void;
  wrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
}

export function ReturnFlow({ open, onClose, wrs, warehouseId, agencyId }: ReturnFlowProps) {
  const [instructions, setInstructions] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const canSubmit = uploadedFiles.length > 0;

  const handleFilesChange = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(files);
  }, []);

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", "return");
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
      if (instructions.trim()) fd.set("instructions", instructions.trim());
      fd.set("metadata", JSON.stringify({
        return_label_path: uploadedFiles[0]?.storagePath ?? undefined,
      }));

      const result = await createWorkOrder(fd);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Solicitud de devolucion creada", "success");
        onClose();
      }
    });
  }

  return (
    <ServiceFlowWrapper
      open={open}
      onClose={onClose}
      title="Devolucion"
      size="sm"
      wrs={wrs}
      submitLabel="Solicitar Devolucion"
      submitDisabled={!canSubmit}
      submitting={isPending}
      onSubmit={handleSubmit}
    >
      <div>
        <span className="mb-1 block text-sm text-gray-600">
          Etiqueta de devolucion <span className="text-red-400">*</span>
        </span>
        <FileUpload
          bucket="work-orders"
          folder={`returns/${Date.now()}`}
          accept=".pdf,image/*"
          maxFiles={1}
          onFilesChange={handleFilesChange}
        />
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
