"use client";

import { TICKET_CATEGORIES } from "@no-wms/shared/constants/statuses";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { inputClass, selectClass, textareaClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { getAgencies } from "@/lib/actions/agencies";
import { createTicket } from "@/lib/actions/tickets";
import { getWarehouseReceipts } from "@/lib/actions/warehouse-receipts";

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  agencyId?: string;
}

export function TicketModal({ open, onClose, agencyId }: TicketModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [agencies, setAgencies] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [wrs, setWrs] = useState<Array<{ id: string; wr_number: string; packages?: { tracking_number: string }[] }>>([]);

  // Lazy-load reference data when modal opens
  useEffect(() => {
    if (!open) return;

    if (!agencyId) {
      getAgencies().then((res) => {
        if (res.data) {
          setAgencies(
            res.data.map((a: { id: string; name: string; code: string }) => ({
              id: a.id,
              name: a.name,
              code: a.code,
            })),
          );
        }
      });
    }

    getWarehouseReceipts({ limit: 50 }).then((res) => {
      if (res.data) {
        setWrs(
          res.data.map((wr: { id: string; wr_number: string; packages?: { tracking_number: string }[] }) => ({
            id: wr.id,
            wr_number: wr.wr_number,
            packages: wr.packages,
          })),
        );
      }
    });
  }, [open, agencyId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Collect selected WR IDs
    const selectedWrs = Array.from(
      formRef.current!.querySelectorAll<HTMLInputElement>("input[name='wr_ids']:checked"),
    ).map((cb) => cb.value);
    if (selectedWrs.length) {
      formData.set("warehouse_receipt_ids", JSON.stringify(selectedWrs));
    }

    startTransition(async () => {
      const result = await createTicket(formData);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Ticket creado", "success");
        router.push(`/tickets/${result.id}`);
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <form ref={formRef} onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>Nuevo Ticket</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Ticket
              </legend>

              {agencyId ? (
                <input type="hidden" name="agency_id" value={agencyId} />
              ) : (
                agencies.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Agencia<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <Combobox
                      name="agency_id"
                      options={agencies.map((a) => ({
                        value: a.id,
                        label: `${a.code} — ${a.name}`,
                      }))}
                      placeholder="Seleccionar agencia..."
                      required
                    />
                  </div>
                )
              )}

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Categoría<span className="ml-0.5 text-red-400">*</span>
                </label>
                <select name="category" required className={selectClass}>
                  <option value="">Seleccionar categoría...</option>
                  {TICKET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Asunto<span className="ml-0.5 text-red-400">*</span>
                </label>
                <input
                  name="subject"
                  type="text"
                  required
                  maxLength={255}
                  className={inputClass}
                  placeholder="Asunto del ticket"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Descripción<span className="ml-0.5 text-red-400">*</span>
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  className={textareaClass}
                  placeholder="Describe el problema o solicitud..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Prioridad
                </label>
                <select name="priority" defaultValue="normal" className={selectClass}>
                  <option value="low">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </fieldset>

            {wrs.length > 0 && (
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  WRs Relacionados
                </legend>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {wrs.map((wr) => (
                    <label key={wr.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                      <input
                        type="checkbox"
                        name="wr_ids"
                        value={wr.id}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                      />
                      <span className="font-medium text-gray-900">{wr.wr_number}</span>
                      {wr.packages?.[0]?.tracking_number && (
                        <span className="text-gray-500">— {wr.packages[0].tracking_number}</span>
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Creando..." : "Crear Ticket"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
