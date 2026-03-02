"use client";

import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { createTariffRate, updateTariffRate } from "@/lib/actions/tariffs";

interface TariffRateFormProps {
  scheduleId: string;
  rate?: {
    id: string;
    min_weight_lb: number;
    max_weight_lb: number;
    rate_per_lb: number;
    minimum_charge: number;
  };
  onDone: () => void;
}

export function TariffRateForm({ scheduleId, rate, onDone }: TariffRateFormProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!rate;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("schedule_id", scheduleId);

    startTransition(async () => {
      if (isEditing) {
        const result = await updateTariffRate(rate.id, formData);
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Banda actualizada", "success");
          onDone();
        }
      } else {
        const result = await createTariffRate(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Banda agregada", "success");
          onDone();
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded border bg-gray-50 p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Min (lb)</label>
        <input
          name="min_weight_lb"
          type="number"
          step="0.01"
          required
          defaultValue={rate?.min_weight_lb ?? ""}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Max (lb)</label>
        <input
          name="max_weight_lb"
          type="number"
          step="0.01"
          required
          defaultValue={rate?.max_weight_lb ?? ""}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">$/lb</label>
        <input
          name="rate_per_lb"
          type="number"
          step="0.0001"
          required
          defaultValue={rate?.rate_per_lb ?? ""}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Min. cargo</label>
        <input
          name="minimum_charge"
          type="number"
          step="0.01"
          defaultValue={rate?.minimum_charge ?? 0}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "..." : isEditing ? "Guardar" : "Agregar"}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
      >
        Cancelar
      </button>
    </form>
  );
}
