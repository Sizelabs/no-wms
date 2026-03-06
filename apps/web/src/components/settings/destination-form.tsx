"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { createDestination, updateDestination } from "@/lib/actions/destinations";

interface DestinationFormProps {
  destination?: {
    id: string;
    city: string;
    country_code: string;
    currency: string;
    is_active: boolean;
  };
}

export function DestinationForm({ destination }: DestinationFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!destination;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (isEditing) {
        const result = await updateDestination(destination.id, formData);
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Destino actualizado", "success");
          router.push("/settings/destinations");
          router.refresh();
        }
      } else {
        const result = await createDestination(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Destino creado", "success");
          router.push("/settings/destinations");
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4 rounded-lg border bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Ciudad</label>
        <input
          name="city"
          type="text"
          required
          defaultValue={destination?.city ?? ""}
          placeholder="Ej: Panama City"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Código de País</label>
        <input
          name="country_code"
          type="text"
          required
          maxLength={3}
          defaultValue={destination?.country_code ?? ""}
          placeholder="Ej: PA"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Moneda</label>
        <select
          name="currency"
          defaultValue={destination?.currency ?? "USD"}
          className={selectClass}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="PEN">PEN</option>
          <option value="COP">COP</option>
          <option value="MXN">MXN</option>
          <option value="CLP">CLP</option>
          <option value="BRL">BRL</option>
          <option value="ARS">ARS</option>
        </select>
      </div>

      {isEditing && (
        <div className="flex items-center gap-2">
          <input
            name="is_active"
            type="checkbox"
            value="true"
            defaultChecked={destination.is_active}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label className="text-sm text-gray-700">Activo</label>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Destino"}
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
