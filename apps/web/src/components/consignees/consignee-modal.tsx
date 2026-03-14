"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { CityTypeahead } from "@/components/ui/city-typeahead";
import { Combobox } from "@/components/ui/combobox";
import { disabledInputClass, inputClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { getAgencies } from "@/lib/actions/agencies";
import { createConsignee, updateConsignee } from "@/lib/actions/consignees";

interface Consignee {
  id: string;
  full_name: string;
  casillero: string;
  cedula_ruc: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  is_active: boolean;
  agencies: { id: string; name: string; code: string } | null;
}

interface ConsigneeModalProps {
  open: boolean;
  onClose: () => void;
  consignee?: Consignee | null;
  defaultAgencyId?: string;
}

export function ConsigneeModal({
  open,
  onClose,
  consignee,
  defaultAgencyId,
}: ConsigneeModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [agencies, setAgencies] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const isEditing = !!consignee;

  // Lazy-load agencies when creating
  useEffect(() => {
    if (!open || isEditing) return;
    getAgencies().then(({ data }) => {
      if (data) {
        setAgencies(data.map((a) => ({ id: a.id, name: a.name, code: a.code })));
      }
    });
  }, [open, isEditing]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (isEditing) {
          const result = await updateConsignee(consignee.id, formData);
          if (result.error) {
            notify(result.error, "error");
            return;
          }
          notify("Consignatario actualizado", "success");
        } else {
          const result = await createConsignee(formData);
          if (result.error) {
            notify(result.error, "error");
            return;
          }
          notify("Consignatario creado", "success");
        }
        router.refresh();
        onClose();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al guardar consignatario",
          "error",
        );
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          {isEditing ? "Editar Consignatario" : "Nuevo Consignatario"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* ---- Identificacion ---- */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Identificaci&oacute;n
              </legend>

              {/* Agency */}
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Agencia<span className="ml-0.5 text-red-400">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={
                      consignee.agencies
                        ? `${consignee.agencies.name} (${consignee.agencies.code})`
                        : ""
                    }
                    className={disabledInputClass}
                  />
                ) : (
                  <Combobox
                    name="agency_id"
                    options={agencies.map((a) => ({
                      value: a.id,
                      label: `${a.name} (${a.code})`,
                    }))}
                    defaultValue={defaultAgencyId}
                    placeholder="Seleccionar agencia..."
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Casillero */}
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Casillero
                  </label>
                  <input
                    name="casillero"
                    type="text"
                    defaultValue={consignee?.casillero ?? ""}
                    className={`${inputClass} font-mono`}
                  />
                  {!isEditing && (
                    <p className="mt-1.5 text-xs text-gray-400">
                      Se genera autom&aacute;ticamente si se deja vac&iacute;o
                    </p>
                  )}
                </div>

                {/* Full name */}
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Nombre completo<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    name="full_name"
                    type="text"
                    required
                    defaultValue={consignee?.full_name ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Cedula / RUC */}
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    C&eacute;dula / RUC
                  </label>
                  <input
                    name="cedula_ruc"
                    type="text"
                    defaultValue={consignee?.cedula_ruc ?? ""}
                    className={inputClass}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={consignee?.email ?? ""}
                    className={inputClass}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Tel&eacute;fono
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={consignee?.phone ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
            </fieldset>

            {/* ---- Direccion ---- */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Direcci&oacute;n
              </legend>

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Direcci&oacute;n l&iacute;nea 1
                </label>
                <input
                  name="address_line1"
                  type="text"
                  defaultValue={consignee?.address_line1 ?? ""}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Direcci&oacute;n l&iacute;nea 2
                </label>
                <input
                  name="address_line2"
                  type="text"
                  defaultValue={consignee?.address_line2 ?? ""}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* City */}
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Ciudad
                  </label>
                  <CityTypeahead
                    defaultCity={consignee?.city ?? ""}
                    defaultState={consignee?.province ?? ""}
                    stateFieldName="province"
                    countryCodeFieldName={null}
                  />
                </div>

                {/* Postal code */}
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    C&oacute;digo postal
                  </label>
                  <input
                    name="postal_code"
                    type="text"
                    defaultValue={consignee?.postal_code ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
            </fieldset>
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
            {isPending
              ? "Guardando..."
              : isEditing
                ? "Guardar"
                : "Crear Consignatario"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
