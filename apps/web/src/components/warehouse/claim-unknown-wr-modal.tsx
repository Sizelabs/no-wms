"use client";

import { useCallback, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { createUnknownWrClaimTicket } from "@/lib/actions/unknown-wrs";
import { formatDate } from "@/lib/format";

interface WrSummary {
  id: string;
  wr_number: string;
  tracking_number_masked?: string;
  packages: Array<{ tracking_number: string | null; carrier: string; sender_name: string }>;
  consignees: { full_name: string }[] | { full_name: string } | null;
  received_at: string;
}

interface ClaimUnknownWrModalProps {
  wr: WrSummary | null;
  onClose: () => void;
}

export function ClaimUnknownWrModal({ wr, onClose }: ClaimUnknownWrModalProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const consigneeName = wr
    ? (Array.isArray(wr.consignees) ? wr.consignees[0]?.full_name : wr.consignees?.full_name) ?? "—"
    : "";

  const handleSubmit = useCallback(() => {
    if (!wr) return;
    if (description.trim().length < 10) return;

    startTransition(async () => {
      const result = await createUnknownWrClaimTicket(
        wr.id,
        description,
        attachments.map((a) => ({
          storagePath: a.storagePath,
          fileName: a.fileName,
          contentType: a.fileName.endsWith(".pdf") ? "application/pdf" : "image/*",
        })),
      );

      if (result.success) {
        notify("Reclamo enviado. Se creó un ticket para revisión.", "success");
        setDescription("");
        setAttachments([]);
        onClose();
      } else {
        notify(result.error ?? "Error al enviar reclamo", "error");
      }
    });
  }, [wr, description, attachments, notify, onClose]);

  return (
    <Modal open={!!wr} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>Reclamo sin guía</ModalHeader>
      <ModalBody>
        {wr && (
          <div className="space-y-4">
            {/* WR summary */}
            <div className="rounded-lg border bg-gray-50 p-3 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="text-gray-500">WR#:</span>{" "}
                  <span className="font-mono font-medium">{wr.wr_number}</span>
                </div>
                <div>
                  <span className="text-gray-500">Guía:</span>{" "}
                  <span className="font-mono">{wr.tracking_number_masked ?? "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Remitente:</span>{" "}
                  {wr.packages?.[0]?.sender_name ?? "—"}
                </div>
                <div>
                  <span className="text-gray-500">Destinatario:</span> {consigneeName}
                </div>
                <div>
                  <span className="text-gray-500">Transportista:</span>{" "}
                  {wr.packages?.[0]?.carrier ?? "—"}
                </div>
                <div>
                  <span className="text-gray-500">Fecha:</span>{" "}
                  {formatDate(wr.received_at)}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="claim-description" className="mb-1 block text-sm font-medium text-gray-700">
                Descripción del reclamo
              </label>
              <textarea
                id="claim-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explique por qué cree que este paquete pertenece a su agencia (min. 10 caracteres)..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
              />
              {description.length > 0 && description.trim().length < 10 && (
                <p className="mt-1 text-xs text-red-500">Mínimo 10 caracteres</p>
              )}
            </div>

            {/* File upload */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Evidencia (opcional, max 3 archivos)
              </label>
              <FileUpload
                bucket="ticket-attachments"
                folder={`claims/${wr.id}`}
                accept=".pdf,image/*"
                maxFiles={3}
                maxSizeMB={10}
                onFilesChange={setAttachments}
              />
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || description.trim().length < 10}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Enviando..." : "Enviar reclamo"}
        </button>
      </ModalFooter>
    </Modal>
  );
}
