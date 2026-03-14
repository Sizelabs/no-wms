"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { AGENCY_TYPE_LABELS } from "@no-wms/shared/constants/agency-types";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import {
  checkboxClass,
  inputClass,
  selectClass,
} from "@/components/ui/form-section";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { createAgencyWithAdmin, updateAgency } from "@/lib/actions/agencies";
import { getCouriers } from "@/lib/actions/couriers";
import { getDestinationsList } from "@/lib/actions/destinations";
import { createClient } from "@/lib/supabase/client";

interface Agency {
  id: string;
  name: string;
  code: string;
  type: string;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  allow_multi_package: boolean;
}

interface AgencyModalProps {
  open: boolean;
  onClose: () => void;
  agency?: Agency | null;
}

interface CourierOption {
  id: string;
  name: string;
  code: string;
}

interface DestinationOption {
  id: string;
  city: string;
  country_code: string;
}

export function AgencyModal({ open, onClose, agency }: AgencyModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [courierScope, setCourierScope] = useState<string[] | null>(null);
  const isEditing = !!agency;

  // Lazy-load reference data for create mode
  useEffect(() => {
    if (!open || isEditing) return;

    const supabase = createClient();

    // Fetch organization ID from profile
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

      // Fetch courier scope
      supabase
        .from("user_roles")
        .select("courier_id")
        .eq("user_id", user.id)
        .then(({ data: roles }) => {
          if (!roles || roles.length === 0) {
            setCourierScope(null);
          } else {
            const ids = roles
              .map((r) => r.courier_id)
              .filter((id): id is string => id != null);
            setCourierScope(ids.length > 0 ? ids : null);
          }
        });
    });

    // Fetch couriers
    getCouriers().then(({ data }) => {
      if (data) {
        setCouriers(data.map((c) => ({ id: c.id, name: c.name, code: c.code })));
      }
    });

    // Fetch destinations
    getDestinationsList().then(({ data }) => {
      if (data) {
        setDestinations(
          data.map((d) => ({ id: d.id, city: d.city, country_code: d.country_code })),
        );
      }
    });
  }, [open, isEditing]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateAgency(agency.id, formData);
          notify("Agencia actualizada", "success");
        } else {
          if (organizationId) formData.set("organization_id", organizationId);
          await createAgencyWithAdmin(formData);
          notify("Agencia creada", "success");
        }
        router.refresh();
        onClose();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al guardar agencia",
          "error",
        );
      }
    });
  }

  // Filter couriers by scope if applicable
  const availableCouriers =
    courierScope !== null
      ? couriers.filter((c) => courierScope.includes(c.id))
      : couriers;

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          {isEditing ? "Editar Agencia" : "Nueva Agencia"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Agencia
              </legend>

              {!isEditing && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Courier<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <Combobox
                      name="courier_id"
                      options={availableCouriers.map((c) => ({
                        value: c.id,
                        label: `${c.name} (${c.code})`,
                      }))}
                      placeholder="Seleccionar courier"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Destino principal<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <Combobox
                      name="destination_id"
                      options={destinations.map((d) => ({
                        value: d.id,
                        label: `${d.city} (${d.country_code})`,
                      }))}
                      placeholder="Seleccionar destino"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Nombre<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={agency?.name ?? ""}
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
                    defaultValue={agency?.code ?? ""}
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
                    defaultValue={agency?.type ?? "corporativo"}
                    className={selectClass}
                  >
                    {Object.entries(AGENCY_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">RUC</label>
                  <input
                    name="ruc"
                    type="text"
                    defaultValue={agency?.ruc ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Direccion
                </label>
                <input
                  name="address"
                  type="text"
                  defaultValue={agency?.address ?? ""}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Telefono
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={agency?.phone ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={agency?.email ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="allow_multi_package"
                  name="allow_multi_package"
                  type="checkbox"
                  defaultChecked={agency?.allow_multi_package ?? true}
                  className={checkboxClass}
                />
                <label
                  htmlFor="allow_multi_package"
                  className="text-sm text-gray-600"
                >
                  Permitir multiples paquetes por recibo
                </label>
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
                      Correo electronico<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      name="admin_email"
                      type="email"
                      required
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Se le enviara una invitacion para configurar su contrasena.
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
            {isPending ? "Guardando..." : isEditing ? "Guardar" : "Crear Agencia"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
