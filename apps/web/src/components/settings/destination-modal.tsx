"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { CityTypeahead } from "@/components/ui/city-typeahead";
import { selectClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { createDestination, updateDestination } from "@/lib/actions/destinations";

interface Destination {
  id: string;
  city: string;
  state: string | null;
  country_code: string;
  country_name: string | null;
  currency: string;
  is_active: boolean;
}

interface DestinationModalProps {
  open: boolean;
  onClose: () => void;
  destination?: Destination | null;
}

export function DestinationModal({ open, onClose, destination }: DestinationModalProps) {
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
          router.refresh();
          onClose();
        }
      } else {
        const result = await createDestination(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Destino creado", "success");
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
          {isEditing ? "Editar Destino" : "Nuevo Destino"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Ubicación
              </legend>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Destino<span className="ml-0.5 text-red-400">*</span>
                </label>
                <CityTypeahead
                  defaultCity={destination?.city}
                  defaultState={destination?.state ?? ""}
                  defaultCountryCode={destination?.country_code}
                  defaultCountry={destination?.country_name ?? ""}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Moneda<span className="ml-0.5 text-red-400">*</span>
                </label>
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
            </fieldset>

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
            {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Destino"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
