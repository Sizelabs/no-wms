"use client";

import { MODALITY_LABELS } from "@no-wms/shared/constants/modalities";
import { TARIFF_SIDE_LABELS, TARIFF_TYPE_LABELS } from "@no-wms/shared/constants/tariff";
import { WORK_ORDER_TYPE_LABELS } from "@no-wms/shared/constants/work-order-types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import type { BracketRow } from "@/components/tariffs/bracket-editor";
import { BracketEditor } from "@/components/tariffs/bracket-editor";
import { Combobox } from "@/components/ui/combobox";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { createTariffSchedule, saveTariffBrackets, updateTariffSchedule } from "@/lib/actions/tariffs";

interface Entity {
  id: string;
  name: string;
  code: string;
}

interface Destination {
  id: string;
  city: string;
  country_code: string;
}

interface ShippingCategory {
  id: string;
  code: string;
  name: string;
  country_code: string;
}

interface ExistingSchedule {
  id: string;
  tariff_side: string;
  tariff_type: string;
  courier_id: string | null;
  agency_id: string | null;
  destination_id: string | null;
  modality: string | null;
  shipping_category_id: string | null;
  work_order_type: string | null;
  base_fee: number;
  weight_unit: string;
  volumetric_divisor: number | null;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  tariff_brackets?: { min_weight: number; max_weight: number; rate_per_unit: number; minimum_charge: number }[];
}

interface TariffScheduleFormProps {
  couriers: Entity[];
  agencies: Entity[];
  destinations: Destination[];
  shippingCategories: ShippingCategory[];
  schedule?: ExistingSchedule;
}

export function TariffScheduleForm({
  couriers,
  agencies,
  destinations,
  shippingCategories,
  schedule,
}: TariffScheduleFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!schedule;

  const [tariffSide, setTariffSide] = useState(schedule?.tariff_side ?? "forwarder_to_courier");
  const [tariffType, setTariffType] = useState(schedule?.tariff_type ?? "shipping");
  const [courierId, setCourierId] = useState(schedule?.courier_id ?? "");
  const [agencyId, setAgencyId] = useState(schedule?.agency_id ?? "");
  const [destinationId, setDestinationId] = useState(schedule?.destination_id ?? "");
  const [categoryId, setCategoryId] = useState(schedule?.shipping_category_id ?? "");
  const [brackets, setBrackets] = useState<BracketRow[]>(
    schedule?.tariff_brackets?.map((b) => ({
      min_weight: Number(b.min_weight),
      max_weight: Number(b.max_weight),
      rate_per_unit: Number(b.rate_per_unit),
      minimum_charge: Number(b.minimum_charge),
    })) ?? [],
  );

  const courierOptions = couriers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }));
  const agencyOptions = agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }));
  const destinationOptions = destinations.map((d) => ({ value: d.id, label: `${d.city} (${d.country_code})` }));

  const selectedDest = destinations.find((d) => d.id === destinationId);
  const filteredCategories = selectedDest
    ? shippingCategories.filter((c) => c.country_code === selectedDest.country_code)
    : shippingCategories;
  const categoryOptions = filteredCategories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Set combobox values
    formData.set("courier_id", courierId || "");
    formData.set("agency_id", agencyId || "");
    formData.set("destination_id", destinationId || "");
    formData.set("shipping_category_id", categoryId || "");

    startTransition(async () => {
      if (isEditing) {
        const result = await updateTariffSchedule(schedule.id, formData);
        if (result.error) {
          notify(result.error, "error");
          return;
        }
        // Save brackets
        const bracketResult = await saveTariffBrackets(schedule.id, brackets);
        if (bracketResult.error) {
          notify(bracketResult.error, "error");
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
        // Save brackets for new schedule
        if (brackets.length > 0) {
          const bracketResult = await saveTariffBrackets(result.id, brackets);
          if (bracketResult.error) {
            notify(bracketResult.error, "error");
            return;
          }
        }
        notify("Tarifa creada", "success");
        router.push(`/tariffs/${result.id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-white p-6">
      {/* Step 1: Side + Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Lado de tarifa</label>
          <select
            name="tariff_side"
            required
            value={tariffSide}
            onChange={(e) => setTariffSide(e.target.value)}
            className={selectClass}
          >
            {Object.entries(TARIFF_SIDE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de tarifa</label>
          <select
            name="tariff_type"
            required
            value={tariffType}
            onChange={(e) => setTariffType(e.target.value)}
            className={selectClass}
          >
            {Object.entries(TARIFF_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 2: Customer targeting */}
      <div className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">Segmentación de cliente</h3>
        {tariffSide === "courier_to_agency" && (
          <div>
            <label className="mb-1 block text-xs text-gray-500">Courier (propietario)</label>
            <Combobox
              name="_courier_id"
              options={courierOptions}
              value={courierId}
              onChange={setCourierId}
              placeholder="Seleccionar courier"
              required
            />
          </div>
        )}
        {tariffSide === "forwarder_to_courier" && (
          <div>
            <label className="mb-1 block text-xs text-gray-500">Courier específico (vacío = tarifa base)</label>
            <Combobox
              name="_courier_id"
              options={courierOptions}
              value={courierId}
              onChange={setCourierId}
              placeholder="Todos los couriers (base)"
            />
          </div>
        )}
        {tariffSide === "courier_to_agency" && (
          <div>
            <label className="mb-1 block text-xs text-gray-500">Agencia específica (vacío = tarifa base)</label>
            <Combobox
              name="_agency_id"
              options={agencyOptions}
              value={agencyId}
              onChange={setAgencyId}
              placeholder="Todas las agencias (base)"
            />
          </div>
        )}
      </div>

      {/* Step 3: Dimensions */}
      {tariffType === "shipping" && (
        <div className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-700">Dimensiones de envío</h3>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Destino</label>
            <Combobox
              name="_destination_id"
              options={destinationOptions}
              value={destinationId}
              onChange={setDestinationId}
              placeholder="Seleccionar destino"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Modalidad (opcional)</label>
              <select
                name="modality"
                defaultValue={schedule?.modality ?? ""}
                className={selectClass}
              >
                <option value="">Sin filtro (catch-all)</option>
                {Object.entries(MODALITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Categoría (opcional)</label>
              <Combobox
                name="_category_id"
                options={categoryOptions}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Sin filtro (catch-all)"
              />
            </div>
          </div>
        </div>
      )}

      {tariffType === "work_order" && (
        <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de orden de trabajo</label>
          <select
            name="work_order_type"
            required
            defaultValue={schedule?.work_order_type ?? ""}
            className={selectClass}
          >
            <option value="">Seleccionar tipo</option>
            {Object.entries(WORK_ORDER_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      )}

      {/* Step 4: Pricing */}
      <div className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">Configuración de precio</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Tarifa base ($)</label>
            <input
              name="base_fee"
              type="number"
              step="0.01"
              min="0"
              defaultValue={schedule?.base_fee ?? 0}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Unidad de peso</label>
            <select
              name="weight_unit"
              defaultValue={schedule?.weight_unit ?? "kg"}
              className={selectClass}
            >
              <option value="kg">Kilogramos (kg)</option>
              <option value="lb">Libras (lb)</option>
              <option value="volumetric">Volumétrico</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Moneda</label>
            <select
              name="currency"
              defaultValue={schedule?.currency ?? "USD"}
              className={selectClass}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 5: Brackets */}
      <BracketEditor
        value={brackets}
        onChange={setBrackets}
        weightUnit={schedule?.weight_unit ?? "kg"}
      />

      {/* Step 6: Dates */}
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
