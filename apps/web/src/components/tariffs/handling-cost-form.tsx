"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass } from "@/components/ui/form-section";
import { createHandlingCost, updateHandlingCost } from "@/lib/actions/tariffs";

interface HandlingCostFormProps {
  handlingCost?: {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
  };
}

export function HandlingCostForm({ handlingCost }: HandlingCostFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!handlingCost;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (isEditing) {
        const result = await updateHandlingCost(handlingCost.id, formData);
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Costo de manejo actualizado", "success");
          router.push("/settings/handling-costs");
          router.refresh();
        }
      } else {
        const result = await createHandlingCost(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Costo de manejo creado", "success");
          router.push("/settings/handling-costs");
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4 rounded-lg border bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={handlingCost?.name ?? ""}
          placeholder="Ej: Flete Aéreo x KG"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
        <input
          name="description"
          type="text"
          defaultValue={handlingCost?.description ?? ""}
          placeholder="Descripción opcional"
          className={inputClass}
        />
      </div>

      {isEditing && (
        <div className="flex items-center gap-2">
          <input
            name="is_active"
            type="checkbox"
            value="true"
            defaultChecked={handlingCost.is_active}
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
          {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Costo de Manejo"}
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
