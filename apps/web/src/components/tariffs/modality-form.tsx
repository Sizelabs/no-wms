"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass } from "@/components/ui/form-section";
import { createModality, updateModality } from "@/lib/actions/tariffs";

interface ModalityFormProps {
  modality?: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
  };
}

export function ModalityForm({ modality }: ModalityFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!modality;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (isEditing) {
        const result = await updateModality(modality.id, formData);
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Modalidad actualizada", "success");
          router.push("/settings/modalities");
          router.refresh();
        }
      } else {
        const result = await createModality(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Modalidad creada", "success");
          router.push("/settings/modalities");
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
          defaultValue={modality?.name ?? ""}
          placeholder="Ej: Aérea"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Identificador</label>
        <input
          name="code"
          type="text"
          required
          maxLength={20}
          defaultValue={modality?.code ?? ""}
          placeholder="Ej: aerea"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
        <input
          name="description"
          type="text"
          defaultValue={modality?.description ?? ""}
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
            defaultChecked={modality.is_active}
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
          {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Modalidad"}
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
