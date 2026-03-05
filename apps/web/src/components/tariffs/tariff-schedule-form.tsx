"use client";

import { RATE_UNIT_LABELS } from "@no-wms/shared/constants/tariff";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { createTariffSchedule, updateTariffSchedule } from "@/lib/actions/tariffs";

interface Entity {
  id: string;
  name: string;
  code: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface ChargeType {
  id: string;
  name: string;
}

interface Destination {
  id: string;
  city: string;
  country_code: string;
}

interface ExistingSchedule {
  id: string;
  warehouse_id: string;
  charge_type_id: string;
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

interface TariffScheduleFormProps {
  warehouses: Warehouse[];
  chargeTypes: ChargeType[];
  destinations: Destination[];
  agencies: Entity[];
  couriers: Entity[];
  schedule?: ExistingSchedule;
}

export function TariffScheduleForm({
  warehouses,
  chargeTypes,
  destinations,
  agencies,
  couriers,
  schedule,
}: TariffScheduleFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!schedule;

  const [warehouseId, setWarehouseId] = useState(schedule?.warehouse_id ?? "");
  const [chargeTypeId, setChargeTypeId] = useState(schedule?.charge_type_id ?? "");
  const [destinationId, setDestinationId] = useState(schedule?.destination_id ?? "");
  const [agencyId, setAgencyId] = useState(schedule?.agency_id ?? "");
  const [courierId, setCourierId] = useState(schedule?.courier_id ?? "");

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));
  const chargeTypeOptions = chargeTypes.map((ct) => ({ value: ct.id, label: ct.name }));
  const destinationOptions = destinations.map((d) => ({ value: d.id, label: `${d.city} (${d.country_code})` }));
  const agencyOptions = agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }));
  const courierOptions = couriers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    formData.set("warehouse_id", warehouseId);
    formData.set("charge_type_id", chargeTypeId);
    formData.set("destination_id", destinationId || "");
    formData.set("agency_id", agencyId || "");
    formData.set("courier_id", courierId || "");

    startTransition(async () => {
      if (isEditing) {
        const result = await updateTariffSchedule(schedule.id, formData);
        if (result.error) {
          notify(result.error, "error");
          return;
        }
        notify("Tarifa actualizada", "success");
        router.push(`/tariffs/${schedule.id}`);
        router.refresh();
      } else {
        const result = await createTariffSchedule(formData);
        if ("error" in result) {
          notify(result.error, "error");
          return;
        }
        notify("Tarifa creada", "success");
        router.push(`/tariffs/${result.id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-white p-6">
      {/* Warehouse + Charge Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Bodega</label>
          <Combobox
            name="_warehouse_id"
            options={warehouseOptions}
            value={warehouseId}
            onChange={setWarehouseId}
            placeholder="Seleccionar bodega"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Costo de Manejo</label>
          <Combobox
            name="_charge_type_id"
            options={chargeTypeOptions}
            value={chargeTypeId}
            onChange={setChargeTypeId}
            placeholder="Seleccionar costo de manejo"
            required
          />
        </div>
      </div>

      {/* Destination */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Destino <span className="font-normal text-gray-400">(vacío = todos los destinos)</span>
        </label>
        <Combobox
          name="_destination_id"
          options={destinationOptions}
          value={destinationId}
          onChange={setDestinationId}
          placeholder="Todos los destinos"
        />
      </div>

      {/* Courier + Agency scoping */}
      <div className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">Alcance (opcional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Courier</label>
            <Combobox
              name="_courier_id"
              options={courierOptions}
              value={courierId}
              onChange={setCourierId}
              placeholder="Sin filtro (base)"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Agencia <span className="font-normal text-gray-400">(requiere courier)</span>
            </label>
            <Combobox
              name="_agency_id"
              options={agencyOptions}
              value={agencyId}
              onChange={setAgencyId}
              placeholder="Sin filtro (base)"
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">Precio</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Tarifa</label>
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
            <label className="mb-1 block text-xs text-gray-500">Unidad</label>
            <select
              name="rate_unit"
              required
              defaultValue={schedule?.rate_unit ?? "per_kg"}
              className={selectClass}
            >
              {Object.entries(RATE_UNIT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Mínimo ($)</label>
            <input
              name="minimum_charge"
              type="number"
              step="0.01"
              min="0"
              defaultValue={schedule?.minimum_charge ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Moneda</label>
            <select
              name="currency"
              defaultValue={schedule?.currency ?? "USD"}
              className={selectClass}
            >
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Vigente desde</label>
          <input
            name="effective_from"
            type="date"
            required
            defaultValue={schedule?.effective_from ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Vigente hasta</label>
          <input
            name="effective_to"
            type="date"
            defaultValue={schedule?.effective_to ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={schedule?.notes ?? ""}
          placeholder="Notas opcionales"
          className={inputClass}
        />
      </div>

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

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Tarifa"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
