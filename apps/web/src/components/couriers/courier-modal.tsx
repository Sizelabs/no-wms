"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { CityTypeahead } from "@/components/ui/city-typeahead";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { createCourier, updateCourier } from "@/lib/actions/couriers";
import { createClient } from "@/lib/supabase/client";

interface Courier {
  id: string;
  name: string;
  code: string;
  type: string;
  ruc: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
}

interface CourierModalProps {
  open: boolean;
  onClose: () => void;
  courier?: Courier | null;
}

export function CourierModal({ open, onClose, courier }: CourierModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const isEditing = !!courier;

  // Lazy-load organization ID for create mode
  useEffect(() => {
    if (!open || isEditing) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.organization_id) setOrganizationId(profile.organization_id);
        });
    });
  }, [open, isEditing]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateCourier(courier.id, formData);
          notify("Courier actualizado", "success");
        } else {
          if (organizationId) formData.set("organization_id", organizationId);
          await createCourier(formData);
          notify("Courier creado", "success");
        }
        router.refresh();
        onClose();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al guardar courier",
          "error",
        );
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          {isEditing ? "Editar Courier" : "Nuevo Courier"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Courier
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Nombre<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={courier?.name ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Identificador<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    name="code"
                    type="text"
                    required
                    maxLength={10}
                    defaultValue={courier?.code ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Tipo<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <select
                    name="type"
                    required
                    defaultValue={courier?.type ?? "corporativo"}
                    className={selectClass}
                  >
                    <option value="corporativo">Corporativo</option>
                    <option value="box">Box</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">RUC</label>
                  <input
                    name="ruc"
                    type="text"
                    defaultValue={courier?.ruc ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">Dirección</label>
                <input
                  name="address"
                  type="text"
                  defaultValue={courier?.address ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">Ciudad</label>
                <CityTypeahead
                  defaultCity={courier?.city ?? ""}
                  defaultCountry={courier?.country ?? ""}
                  countryFieldName="country"
                  countryCodeFieldName={null}
                  stateFieldName={null}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Teléfono</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={courier?.phone ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={courier?.email ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
            </fieldset>

            {!isEditing && (
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Administrador
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Nombre completo<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      name="admin_name"
                      type="text"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Correo electrónico<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      name="admin_email"
                      type="email"
                      required
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Se le enviará una invitación para configurar su contraseña.
                    </p>
                  </div>
                </div>
              </fieldset>
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
            disabled={isPending || (!isEditing && !organizationId)}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : isEditing ? "Guardar" : "Crear Courier"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
