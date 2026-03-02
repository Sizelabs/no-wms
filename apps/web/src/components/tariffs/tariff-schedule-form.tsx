"use client";

import { MODALITY_LABELS } from "@no-wms/shared/constants/modalities";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { createTariffSchedule, updateTariffSchedule } from "@/lib/actions/tariffs";

interface Agency {
  id: string;
  name: string;
  code: string;
}

interface DestinationCountry {
  id: string;
  name: string;
  code: string;
}

interface TariffScheduleFormProps {
  agencies: Agency[];
  destinations: DestinationCountry[];
  schedule?: {
    id: string;
    agency_id: string;
    destination_country_id: string;
    modality: string;
    courier_category: string | null;
    effective_from: string;
    effective_to: string | null;
    is_active: boolean;
  };
}

export function TariffScheduleForm({ agencies, destinations, schedule }: TariffScheduleFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!schedule;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (isEditing) {
        const result = await updateTariffSchedule(schedule.id, formData);
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Tarifa actualizada", "success");
          router.push(`/tariffs/${schedule.id}`);
          router.refresh();
        }
      } else {
        const result = await createTariffSchedule(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Tarifa creada", "success");
          router.push(`/tariffs/${result.id}`);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4 rounded-lg border bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Agencia</label>
        <select
          name="agency_id"
          required
          defaultValue={schedule?.agency_id ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Seleccionar agencia</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">País destino</label>
        <select
          name="destination_country_id"
          required
          defaultValue={schedule?.destination_country_id ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Seleccionar destino</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Modalidad</label>
        <select
          name="modality"
          required
          defaultValue={schedule?.modality ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Seleccionar modalidad</option>
          {Object.entries(MODALITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Categoría Courier</label>
        <input
          name="courier_category"
          type="text"
          defaultValue={schedule?.courier_category ?? ""}
          placeholder="Ej: A, B (opcional)"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Vigente desde</label>
          <input
            name="effective_from"
            type="date"
            required
            defaultValue={schedule?.effective_from ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Vigente hasta</label>
          <input
            name="effective_to"
            type="date"
            defaultValue={schedule?.effective_to ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
