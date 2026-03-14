"use client";

import { RATE_UNIT_LABELS } from "@no-wms/shared/constants/tariff";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { getAgencies } from "@/lib/actions/agencies";
import { getCouriers } from "@/lib/actions/couriers";
import { getDestinationsList } from "@/lib/actions/destinations";
import { createTariffSchedule, getHandlingCosts, updateTariffSchedule } from "@/lib/actions/tariffs";
import { getWarehouses } from "@/lib/actions/warehouses";

interface ExistingSchedule {
  id: string;
  warehouse_id: string;
  handling_cost_id: string;
  destination_id: string | null;
  agency_id: string | null;
  courier_id: string | null;
  rate: number;
  rate_unit: string;
  minimum_charge: number | null;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  is_active: boolean;
}

interface TariffScheduleModalProps {
  open: boolean;
  onClose: () => void;
  schedule?: ExistingSchedule | null;
}

interface Option {
  value: string;
  label: string;
}

export function TariffScheduleModal({ open, onClose, schedule }: TariffScheduleModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!schedule;

  // Reference data
  const [warehouseOptions, setWarehouseOptions] = useState<Option[]>([]);
  const [handlingCostOptions, setHandlingCostOptions] = useState<Option[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<Option[]>([]);
  const [agencyOptions, setAgencyOptions] = useState<Option[]>([]);
  const [courierOptions, setCourierOptions] = useState<Option[]>([]);

  // Form state
  const [warehouseId, setWarehouseId] = useState(schedule?.warehouse_id ?? "");
  const [handlingCostId, setHandlingCostId] = useState(schedule?.handling_cost_id ?? "");
  const [destinationId, setDestinationId] = useState(schedule?.destination_id ?? "");
  const [agencyId, setAgencyId] = useState(schedule?.agency_id ?? "");
  const [courierId, setCourierId] = useState(schedule?.courier_id ?? "");

  // Reset form state when schedule changes
  useEffect(() => {
    setWarehouseId(schedule?.warehouse_id ?? "");
    setHandlingCostId(schedule?.handling_cost_id ?? "");
    setDestinationId(schedule?.destination_id ?? "");
    setAgencyId(schedule?.agency_id ?? "");
    setCourierId(schedule?.courier_id ?? "");
  }, [schedule]);

  // Lazy-load reference data when modal opens
  useEffect(() => {
    if (!open) return;

    getWarehouses().then(({ data }) => {
      if (data) {
        setWarehouseOptions(data.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })));
      }
    });

    getHandlingCosts().then(({ data }) => {
      if (data) {
        setHandlingCostOptions(data.map((h) => ({ value: h.id, label: h.name })));
      }
    });

    getDestinationsList().then(({ data }) => {
      if (data) {
        setDestinationOptions(data.map((d) => ({ value: d.id, label: `${d.city} (${d.country_code})` })));
      }
    });

    getAgencies().then(({ data }) => {
      if (data) {
        setAgencyOptions(data.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` })));
      }
    });

    getCouriers().then(({ data }) => {
      if (data) {
        setCourierOptions(data.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })));
      }
    });
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Set IDs from controlled state (Combobox uses hidden inputs, but we ensure they're set)
    formData.set("warehouse_id", warehouseId);
    formData.set("handling_cost_id", handlingCostId);
    formData.set("destination_id", destinationId);
    formData.set("agency_id", agencyId);
    formData.set("courier_id", courierId);

    startTransition(async () => {
      if (isEditing) {
        const result = await updateTariffSchedule(schedule.id, formData);
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Tarifa actualizada", "success");
          router.refresh();
          onClose();
        }
      } else {
        const result = await createTariffSchedule(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Tarifa creada", "success");
          router.refresh();
          onClose();
        }
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          {isEditing ? "Editar Tarifa" : "Nueva Tarifa"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Alcance */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Alcance
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Bodega<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <Combobox
                    options={warehouseOptions}
                    value={warehouseId}
                    onChange={setWarehouseId}
                    placeholder="Seleccionar bodega"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Costo de Manejo<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <Combobox
                    options={handlingCostOptions}
                    value={handlingCostId}
                    onChange={setHandlingCostId}
                    placeholder="Seleccionar costo"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Destino <span className="text-gray-400">(vacío = todos los destinos)</span>
                </label>
                <Combobox
                  options={destinationOptions}
                  value={destinationId}
                  onChange={setDestinationId}
                  placeholder="Seleccionar destino"
                />
              </div>

              {/* Filtro (opcional) */}
              <fieldset className="space-y-3 rounded-lg border border-gray-100 p-3">
                <legend className="text-xs font-medium uppercase tracking-wider text-gray-400 px-1">
                  Filtro (opcional)
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">Courier</label>
                    <Combobox
                      options={courierOptions}
                      value={courierId}
                      onChange={setCourierId}
                      placeholder="Seleccionar courier"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Agencia <span className="text-gray-400">(requiere courier)</span>
                    </label>
                    <Combobox
                      options={agencyOptions}
                      value={agencyId}
                      onChange={setAgencyId}
                      placeholder="Seleccionar agencia"
                    />
                  </div>
                </div>
              </fieldset>
            </fieldset>

            {/* Precio */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Precio
              </legend>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Tarifa<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    name="rate"
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    defaultValue={schedule?.rate ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Unidad</label>
                  <select
                    name="rate_unit"
                    defaultValue={schedule?.rate_unit ?? "flat"}
                    className={selectClass}
                  >
                    {Object.entries(RATE_UNIT_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Mínimo ($)</label>
                  <input
                    name="minimum_charge"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={schedule?.minimum_charge ?? ""}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Moneda</label>
                  <select
                    name="currency"
                    defaultValue={schedule?.currency ?? "USD"}
                    className={selectClass}
                  >
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Vigencia */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Vigencia
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Desde<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    name="effective_from"
                    type="date"
                    required
                    defaultValue={schedule?.effective_from ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Hasta</label>
                  <input
                    name="effective_to"
                    type="date"
                    defaultValue={schedule?.effective_to ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">Notas</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={schedule?.notes ?? ""}
                  placeholder="Notas opcionales"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"
                />
              </div>
            </fieldset>

            {/* is_active checkbox for editing */}
            {isEditing && (
              <div className="flex items-center gap-2">
                <input
                  name="is_active"
                  type="checkbox"
                  value="true"
                  defaultChecked={schedule.is_active}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">Activa</label>
              </div>
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
            {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Tarifa"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
