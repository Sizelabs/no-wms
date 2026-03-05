"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { createShippingCategory, updateShippingCategory } from "@/lib/actions/tariffs";

interface ShippingCategoryFormProps {
  category?: {
    id: string;
    country_code: string;
    code: string;
    name: string;
    description: string | null;
    display_order: number;
    is_active: boolean;
  };
}

const COUNTRY_OPTIONS = [
  { value: "EC", label: "Ecuador" },
  { value: "CO", label: "Colombia" },
  { value: "PE", label: "Perú" },
  { value: "CL", label: "Chile" },
  { value: "MX", label: "México" },
  { value: "US", label: "Estados Unidos" },
];

export function ShippingCategoryForm({ category }: ShippingCategoryFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!category;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      if (isEditing) {
        const result = await updateShippingCategory(category.id, formData);
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Categoría actualizada", "success");
          router.push("/tariffs/categories");
          router.refresh();
        }
      } else {
        const result = await createShippingCategory(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Categoría creada", "success");
          router.push("/tariffs/categories");
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4 rounded-lg border bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">País</label>
        <select
          name="country_code"
          required
          defaultValue={category?.country_code ?? ""}
          className={selectClass}
        >
          <option value="">Seleccionar país</option>
          {COUNTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label} ({opt.value})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
        <input
          name="code"
          type="text"
          required
          defaultValue={category?.code ?? ""}
          placeholder="Ej: A, B, C"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={category?.name ?? ""}
          placeholder="Ej: Documentos"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
        <input
          name="description"
          type="text"
          defaultValue={category?.description ?? ""}
          placeholder="Descripción opcional"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Orden de visualización</label>
        <input
          name="display_order"
          type="number"
          min="0"
          defaultValue={category?.display_order ?? 0}
          className={inputClass}
        />
      </div>

      {isEditing && (
        <div className="flex items-center gap-2">
          <input
            name="is_active"
            type="checkbox"
            value="true"
            defaultChecked={category.is_active}
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
          {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Categoría"}
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
