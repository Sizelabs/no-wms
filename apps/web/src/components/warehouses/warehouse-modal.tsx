"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { CityTypeahead } from "@/components/ui/city-typeahead";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import type { CitySearchResult } from "@/lib/actions/locations";
import {
  getTimezoneForCoordinates,
  getTimezonesOfCountry,
} from "@/lib/actions/locations";
import { createWarehouse, updateWarehouse } from "@/lib/actions/warehouses";
import { createClient } from "@/lib/supabase/client";

interface TimezoneOption {
  zoneName: string;
  gmtOffsetName: string;
}

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  timezone: string;
  is_active: boolean;
}

interface WarehouseModalProps {
  open: boolean;
  onClose: () => void;
  warehouse?: WarehouseData | null;
}

export function WarehouseModal({ open, onClose, warehouse }: WarehouseModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState(warehouse?.timezone ?? "America/New_York");
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [code, setCode] = useState(warehouse?.code ?? "");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const isEditing = !!warehouse;

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

  function handleCitySelect(result: CitySearchResult | null) {
    if (!result) {
      setTimezones([]);
      return;
    }
    getTimezonesOfCountry(result.countryCode).then((tz) => {
      setTimezones(tz);
      if (!isEditing) {
        const firstTz = tz[0];
        if (firstTz) setTimezone(firstTz.zoneName);
      }
    });
    if (result.longitude) {
      getTimezoneForCoordinates(result.countryCode, result.longitude).then((tz) => {
        if (tz) setTimezone(tz);
      });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("timezone", timezone);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateWarehouse(warehouse.id, formData);
          notify("Bodega actualizada", "success");
        } else {
          if (organizationId) formData.set("organization_id", organizationId);
          await createWarehouse(formData);
          notify("Bodega creada", "success");
        }
        router.refresh();
        onClose();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al guardar bodega",
          "error",
        );
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          {isEditing ? "Editar Bodega" : "Nueva Bodega"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Bodega
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
                    defaultValue={warehouse?.name ?? ""}
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
                    placeholder="MIA"
                    maxLength={5}
                    pattern="[A-Za-z]{2,5}"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {isEditing
                      ? "Cambiar este código solo afectará recibos nuevos."
                      : "Este código será el prefijo de los recibos de almacén."}
                  </p>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Ubicación<span className="ml-0.5 text-red-400">*</span>
                </label>
                <CityTypeahead
                  defaultCity={warehouse?.city ?? ""}
                  defaultCountry={warehouse?.country ?? ""}
                  countryFieldName="country"
                  countryCodeFieldName={null}
                  stateFieldName={null}
                  onSelect={handleCitySelect}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Zona Horaria<span className="ml-0.5 text-red-400">*</span>
                </label>
                {timezones.length > 0 ? (
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    required
                    className={selectClass}
                  >
                    {timezones.map((tz) => (
                      <option key={tz.zoneName} value={tz.zoneName}>
                        {tz.zoneName} ({tz.gmtOffsetName})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={timezone}
                    className={inputClass}
                  />
                )}
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
            disabled={isPending || (!isEditing && !organizationId)}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : isEditing ? "Guardar" : "Crear Bodega"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
