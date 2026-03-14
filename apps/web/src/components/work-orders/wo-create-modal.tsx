"use client";

import type { WorkOrderType } from "@no-wms/shared/constants/work-order-types";
import { WORK_ORDER_TYPE_LABELS } from "@no-wms/shared/constants/work-order-types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import {
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui/form-section";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { getAgencies } from "@/lib/actions/agencies";
import { getWarehouseReceipts } from "@/lib/actions/warehouse-receipts";
import { getWarehouses } from "@/lib/actions/warehouses";
import { createWorkOrder } from "@/lib/actions/work-orders";

interface WoCreateModalProps {
  open: boolean;
  onClose: () => void;
}

export function WoCreateModal({ open, onClose }: WoCreateModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Reference data (lazy-loaded)
  const [agencies, setAgencies] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [warehouses, setWarehouses] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [wrs, setWrs] = useState<
    Array<{
      id: string;
      wr_number: string;
      status: string;
      packages?: { tracking_number: string }[];
    }>
  >([]);

  // Form state
  const [type, setType] = useState<WorkOrderType>("photos");
  const [agencyId, setAgencyId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [selectedWrs, setSelectedWrs] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");

  // Pickup fields
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupPerson, setPickupPerson] = useState("");
  const [pickupContact, setPickupContact] = useState("");

  // Lazy-load reference data when modal opens
  useEffect(() => {
    if (!open) return;

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

    getWarehouses().then((res) => {
      if (res.data) {
        setWarehouses(
          res.data.map((w: { id: string; name: string; code: string }) => ({
            id: w.id,
            name: w.name,
            code: w.code,
          })),
        );
      }
    });

    getWarehouseReceipts({ limit: 200 }).then((res) => {
      if (res.data) {
        setWrs(
          res.data
            .filter(
              (wr: { status: string }) =>
                wr.status === "received" || wr.status === "in_warehouse",
            )
            .map(
              (wr: {
                id: string;
                wr_number: string;
                status: string;
                packages?: { tracking_number: string }[];
              }) => ({
                id: wr.id,
                wr_number: wr.wr_number,
                status: wr.status,
                packages: wr.packages,
              }),
            ),
        );
      }
    });
  }, [open]);

  const toggleWr = (wrId: string) => {
    setSelectedWrs((prev) =>
      prev.includes(wrId)
        ? prev.filter((id) => id !== wrId)
        : [...prev, wrId],
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedWrs.length || !agencyId || !warehouseId) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", type);
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(selectedWrs));
      if (instructions) fd.set("instructions", instructions);

      if (type === "authorize_pickup") {
        fd.set("pickup_date", pickupDate);
        fd.set("pickup_time", pickupTime);
        fd.set("pickup_location", pickupLocation);
        fd.set("pickup_authorized_person", pickupPerson);
        fd.set("pickup_contact_info", pickupContact);
      }

      const res = await createWorkOrder(fd);
      if ("error" in res) {
        notify(res.error, "error");
      } else {
        notify("Orden de trabajo creada", "success");
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <form ref={formRef} onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>Nueva Orden de Trabajo</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Orden de Trabajo fieldset */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Orden de Trabajo
              </legend>

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Tipo<span className="ml-0.5 text-red-400">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as WorkOrderType)}
                  required
                  className={selectClass}
                >
                  {Object.entries(WORK_ORDER_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Bodega<span className="ml-0.5 text-red-400">*</span>
                </label>
                <Combobox
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: `${w.name} (${w.code})`,
                  }))}
                  value={warehouseId}
                  onChange={setWarehouseId}
                  placeholder="Seleccionar bodega..."
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Agencia<span className="ml-0.5 text-red-400">*</span>
                </label>
                <Combobox
                  options={agencies.map((a) => ({
                    value: a.id,
                    label: `${a.code} — ${a.name}`,
                  }))}
                  value={agencyId}
                  onChange={setAgencyId}
                  placeholder="Seleccionar agencia..."
                  required
                />
              </div>
            </fieldset>

            {/* Warehouse Receipts fieldset */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Warehouse Receipts ({selectedWrs.length} seleccionados)
              </legend>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {wrs.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-gray-400">
                    No hay WRs disponibles
                  </p>
                ) : (
                  wrs.map((wr) => (
                    <label
                      key={wr.id}
                      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedWrs.includes(wr.id)}
                        onChange={() => toggleWr(wr.id)}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                      />
                      <span className="font-medium text-gray-900">
                        {wr.wr_number}
                      </span>
                      {wr.packages?.[0]?.tracking_number && (
                        <span className="text-gray-500">
                          — {wr.packages[0].tracking_number}
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </fieldset>

            {/* Instructions */}
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">
                Instrucciones
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className={textareaClass}
                placeholder="Instrucciones para el operario..."
              />
            </div>

            {/* Pickup fieldset (conditional) */}
            {type === "authorize_pickup" && (
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Retiro
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Fecha de retiro
                      <span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Hora
                    </label>
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Ubicación
                      <span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Persona autorizada
                      <span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupPerson}
                      onChange={(e) => setPickupPerson(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Contacto
                    </label>
                    <input
                      type="text"
                      value={pickupContact}
                      onChange={(e) => setPickupContact(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </fieldset>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !selectedWrs.length || !agencyId || !warehouseId}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Creando..." : "Crear Orden de Trabajo"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
