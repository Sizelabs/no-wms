"use client";

import { RATE_UNIT_LABELS, type RateUnit } from "@no-wms/shared/constants/tariff";
import Link from "next/link";
import { useParams } from "next/navigation";

interface TariffSchedule {
  id: string;
  rate: number;
  rate_unit: string;
  minimum_charge: number | null;
  currency: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  warehouses: { id: string; name: string } | null;
  charge_types: { id: string; name: string } | null;
  destinations: { id: string; city: string; country_code: string } | null;
  agencies: { id: string; name: string; code: string } | null;
  couriers: { id: string; name: string; code: string } | null;
}

interface TariffDetailProps {
  schedule: TariffSchedule;
}

export function TariffDetail({ schedule }: TariffDetailProps) {
  const { locale } = useParams<{ locale: string }>();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                schedule.is_active
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {schedule.is_active ? "Activa" : "Inactiva"}
            </span>
            {schedule.agencies && (
              <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Override agencia
              </span>
            )}
          </div>
          <Link
            href={`/${locale}/tariffs/${schedule.id}/edit`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Editar
          </Link>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Costo de Manejo</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {schedule.charge_types?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Bodega</dt>
            <dd className="mt-1 text-sm text-gray-600">{schedule.warehouses?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Destino</dt>
            <dd className="mt-1 text-sm text-gray-600">
              {schedule.destinations
                ? `${schedule.destinations.city} (${schedule.destinations.country_code})`
                : "Todos los destinos"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Tarifa</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">
              ${Number(schedule.rate).toFixed(4)}{" "}
              <span className="text-gray-400">
                {RATE_UNIT_LABELS[schedule.rate_unit as RateUnit] ?? schedule.rate_unit}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Cargo Mínimo</dt>
            <dd className="mt-1 text-sm text-gray-600">
              {schedule.minimum_charge != null
                ? `$${Number(schedule.minimum_charge).toFixed(2)}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Moneda</dt>
            <dd className="mt-1 text-sm text-gray-600">{schedule.currency}</dd>
          </div>
          {schedule.couriers && (
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Courier</dt>
              <dd className="mt-1 text-sm text-gray-600">
                {schedule.couriers.name} ({schedule.couriers.code})
              </dd>
            </div>
          )}
          {schedule.agencies && (
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Agencia</dt>
              <dd className="mt-1 text-sm text-gray-600">
                {schedule.agencies.name} ({schedule.agencies.code})
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Vigencia</dt>
            <dd className="mt-1 text-sm text-gray-600">
              {new Date(schedule.effective_from).toLocaleDateString("es")}
              {schedule.effective_to && ` — ${new Date(schedule.effective_to).toLocaleDateString("es")}`}
            </dd>
          </div>
          {schedule.notes && (
            <div className="sm:col-span-3">
              <dt className="text-xs font-medium uppercase text-gray-500">Notas</dt>
              <dd className="mt-1 text-sm text-gray-600">{schedule.notes}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
