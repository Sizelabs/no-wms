"use client";

import { MODALITY_LABELS } from "@no-wms/shared/constants/modalities";
import { TARIFF_SIDE_LABELS, type TariffSide, TARIFF_TYPE_LABELS, type TariffType, WEIGHT_UNIT_LABELS, type WeightUnit } from "@no-wms/shared/constants/tariff";
import { WORK_ORDER_TYPE_LABELS, type WorkOrderType } from "@no-wms/shared/constants/work-order-types";
import Link from "next/link";

import { BracketEditor } from "@/components/tariffs/bracket-editor";

interface TariffDetailProps {
  schedule: {
    id: string;
    tariff_side: string;
    tariff_type: string;
    courier_id: string | null;
    agency_id: string | null;
    modality: string | null;
    work_order_type: string | null;
    base_fee: number;
    weight_unit: string;
    volumetric_divisor: number | null;
    currency: string;
    is_active: boolean;
    effective_from: string;
    effective_to: string | null;
    created_at: string;
    couriers: { id: string; name: string; code: string } | null;
    agencies: { id: string; name: string; code: string } | null;
    destinations: { id: string; city: string; country_code: string } | null;
    shipping_categories: { id: string; code: string; name: string } | null;
    tariff_brackets: { id: string; min_weight: number; max_weight: number; rate_per_unit: number; minimum_charge: number }[];
  };
  readOnly?: boolean;
}

export function TariffDetail({ schedule, readOnly }: TariffDetailProps) {
  const brackets = (schedule.tariff_brackets ?? []).map((b) => ({
    min_weight: Number(b.min_weight),
    max_weight: Number(b.max_weight),
    rate_per_unit: Number(b.rate_per_unit),
    minimum_charge: Number(b.minimum_charge),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Información de Tarifa</h2>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                schedule.is_active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {schedule.is_active ? "Activa" : "Inactiva"}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              schedule.tariff_side === "forwarder_to_courier"
                ? "bg-blue-100 text-blue-800"
                : "bg-purple-100 text-purple-800"
            }`}>
              {TARIFF_SIDE_LABELS[schedule.tariff_side as TariffSide] ?? schedule.tariff_side}
            </span>
            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {TARIFF_TYPE_LABELS[schedule.tariff_type as TariffType] ?? schedule.tariff_type}
            </span>
            {!readOnly && (
              <Link
                href={`/tariffs/${schedule.id}/edit`}
                className="rounded border px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                Editar
              </Link>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {schedule.couriers && (
            <div>
              <dt className="font-medium text-gray-500">Courier</dt>
              <dd className="mt-0.5 text-gray-900">{schedule.couriers.name} ({schedule.couriers.code})</dd>
            </div>
          )}
          {schedule.agencies && (
            <div>
              <dt className="font-medium text-gray-500">Agencia</dt>
              <dd className="mt-0.5 text-gray-900">{schedule.agencies.name} ({schedule.agencies.code})</dd>
            </div>
          )}
          {!schedule.courier_id && schedule.tariff_side === "forwarder_to_courier" && (
            <div>
              <dt className="font-medium text-gray-500">Cliente</dt>
              <dd className="mt-0.5 text-gray-900">Base (todos los couriers)</dd>
            </div>
          )}
          {!schedule.agency_id && schedule.tariff_side === "courier_to_agency" && (
            <div>
              <dt className="font-medium text-gray-500">Agencia</dt>
              <dd className="mt-0.5 text-gray-900">Base (todas las agencias)</dd>
            </div>
          )}
          {schedule.destinations && (
            <div>
              <dt className="font-medium text-gray-500">Destino</dt>
              <dd className="mt-0.5 text-gray-900">{schedule.destinations.city} ({schedule.destinations.country_code})</dd>
            </div>
          )}
          {schedule.modality && (
            <div>
              <dt className="font-medium text-gray-500">Modalidad</dt>
              <dd className="mt-0.5 text-gray-900">
                {MODALITY_LABELS[schedule.modality as keyof typeof MODALITY_LABELS] ?? schedule.modality}
              </dd>
            </div>
          )}
          {schedule.shipping_categories && (
            <div>
              <dt className="font-medium text-gray-500">Categoría</dt>
              <dd className="mt-0.5 text-gray-900">{schedule.shipping_categories.code} — {schedule.shipping_categories.name}</dd>
            </div>
          )}
          {schedule.work_order_type && (
            <div>
              <dt className="font-medium text-gray-500">Tipo OT</dt>
              <dd className="mt-0.5 text-gray-900">
                {WORK_ORDER_TYPE_LABELS[schedule.work_order_type as WorkOrderType] ?? schedule.work_order_type}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-gray-500">Tarifa base</dt>
            <dd className="mt-0.5 text-gray-900">
              {Number(schedule.base_fee) > 0 ? `$${Number(schedule.base_fee).toFixed(2)}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Unidad de peso</dt>
            <dd className="mt-0.5 text-gray-900">
              {WEIGHT_UNIT_LABELS[schedule.weight_unit as WeightUnit] ?? schedule.weight_unit}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Moneda</dt>
            <dd className="mt-0.5 text-gray-900">{schedule.currency}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Vigente desde</dt>
            <dd className="mt-0.5 text-gray-900">
              {new Date(schedule.effective_from).toLocaleDateString("es")}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Vigente hasta</dt>
            <dd className="mt-0.5 text-gray-900">
              {schedule.effective_to ? new Date(schedule.effective_to).toLocaleDateString("es") : "Sin límite"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <BracketEditor
          value={brackets}
          onChange={() => {}}
          weightUnit={schedule.weight_unit}
          readOnly
        />
      </div>
    </div>
  );
}
