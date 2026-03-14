"use client";

import { RATE_UNIT_LABELS } from "@no-wms/shared/constants/tariff";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { createHandlingCost, updateHandlingCost } from "@/lib/actions/tariffs";

interface HandlingCost {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  base_rate: number;
  base_rate_unit: string;
  base_minimum_charge: number | null;
}

interface HandlingCostModalProps {
  open: boolean;
  onClose: () => void;
  handlingCost?: HandlingCost | null;
}

export function HandlingCostModal({ open, onClose, handlingCost }: HandlingCostModalProps) {
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
          router.refresh();
          onClose();
        }
      } else {
        const result = await createHandlingCost(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Costo de manejo creado", "success");
          router.refresh();
          onClose();
        }
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          {isEditing ? "Editar Costo de Manejo" : "Nuevo Costo de Manejo"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Información General
              </legend>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Nombre<span className="ml-0.5 text-red-400">*</span>
                </label>
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
                <label className="mb-1.5 block text-sm text-gray-600">Descripción</label>
                <input
                  name="description"
                  type="text"
                  defaultValue={handlingCost?.description ?? ""}
                  placeholder="Descripción opcional"
                  className={inputClass}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Tarifa Base
              </legend>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Tarifa ($)</label>
                  <input
                    name="base_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={handlingCost?.base_rate ?? 0}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Unidad</label>
                  <select
                    name="base_rate_unit"
                    defaultValue={handlingCost?.base_rate_unit ?? "flat"}
                    className={selectClass}
                  >
                    {Object.entries(RATE_UNIT_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Mínimo ($)</label>
                  <input
                    name="base_minimum_charge"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={handlingCost?.base_minimum_charge ?? ""}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>
              </div>
            </fieldset>

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
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Costo de Manejo"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
