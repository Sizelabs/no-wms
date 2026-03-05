"use client";

import { MODALITY_LABELS } from "@no-wms/shared/constants/modalities";
import Link from "next/link";

interface TariffDetailProps {
  schedule: {
    id: string;
    modality: string;
    courier_category: string | null;
    rate_type: string;
    is_active: boolean;
    effective_from: string;
    effective_to: string | null;
    min_weight_kg: number;
    max_weight_kg: number;
    rate_per_kg: number;
    minimum_charge: number;
    created_at: string;
    agencies: { name: string; code: string } | null;
    destinations: { city: string; country_code: string } | null;
  };
  readOnly?: boolean;
}

export function TariffDetail({ schedule, readOnly }: TariffDetailProps) {
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
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                schedule.rate_type === "courier_cost"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-purple-100 text-purple-800"
              }`}
            >
              {schedule.rate_type === "courier_cost" ? "Costo courier" : "Tarifa agencia"}
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
          <div>
            <dt className="font-medium text-gray-500">Agencia</dt>
            <dd className="mt-0.5 text-gray-900">
              {schedule.agencies ? `${schedule.agencies.name} (${schedule.agencies.code})` : "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Destino</dt>
            <dd className="mt-0.5 text-gray-900">{schedule.destinations?.city ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Modalidad</dt>
            <dd className="mt-0.5 text-gray-900">
              {MODALITY_LABELS[schedule.modality as keyof typeof MODALITY_LABELS] ?? schedule.modality}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Categoría</dt>
            <dd className="mt-0.5 text-gray-900">{schedule.courier_category ?? "—"}</dd>
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
          <div>
            <dt className="font-medium text-gray-500">Peso mín. (kg)</dt>
            <dd className="mt-0.5 text-gray-900">{Number(schedule.min_weight_kg).toFixed(2)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Peso máx. (kg)</dt>
            <dd className="mt-0.5 text-gray-900">{Number(schedule.max_weight_kg).toFixed(2)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Tarifa / kg</dt>
            <dd className="mt-0.5 text-gray-900">${Number(schedule.rate_per_kg).toFixed(4)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Cargo mínimo</dt>
            <dd className="mt-0.5 text-gray-900">
              {Number(schedule.minimum_charge) > 0 ? `$${Number(schedule.minimum_charge).toFixed(2)}` : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
