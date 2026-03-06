"use client";

import { MapPin, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { CityTypeahead } from "@/components/ui/city-typeahead";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FormActions,
  FormCard,
  FormSection,
  inputClass,
  primaryBtnClass,
  secondaryBtnClass,
} from "@/components/ui/form-section";
import { createConsignee } from "@/lib/actions/consignees";

interface Agency {
  id: string;
  name: string;
  code: string;
}

interface ConsigneeCreateFormProps {
  agencies: Agency[];
  defaultAgencyId?: string;
  defaultCasillero?: string;
}

export function ConsigneeCreateForm({
  agencies,
  defaultAgencyId,
  defaultCasillero,
}: ConsigneeCreateFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createConsignee(formData);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Consignatario creado", "success");
        router.push(`/es/consignees/${result.data!.id}`);
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Identificación" icon={User}>
          <Field label="Agencia" htmlFor="agency_id" required>
            <Combobox
              id="agency_id"
              name="agency_id"
              options={agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
              defaultValue={defaultAgencyId}
              placeholder="Seleccionar agencia"
              required
            />
          </Field>
          <Field
            label="Casillero"
            htmlFor="casillero"
            hint="Se genera automáticamente si se deja vacío"
          >
            <input
              id="casillero"
              name="casillero"
              type="text"
              defaultValue={defaultCasillero ?? ""}
              className={`${inputClass} font-mono`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre completo" htmlFor="full_name" required>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Cédula/RUC" htmlFor="cedula_ruc">
              <input
                id="cedula_ruc"
                name="cedula_ruc"
                type="text"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                className={inputClass}
              />
            </Field>
            <Field label="Teléfono" htmlFor="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>
        <FormSection title="Dirección" icon={MapPin}>
          <Field label="Dirección" htmlFor="address_line1">
            <input
              id="address_line1"
              name="address_line1"
              type="text"
              className={inputClass}
            />
          </Field>
          <Field label="Dirección línea 2" htmlFor="address_line2">
            <input
              id="address_line2"
              name="address_line2"
              type="text"
              className={inputClass}
            />
          </Field>
          <Field label="Ciudad" htmlFor="location_city">
            <CityTypeahead
              id="location_city"
              stateFieldName="province"
              countryCodeFieldName={null}
            />
          </Field>
          <Field label="Código postal" htmlFor="postal_code">
            <input
              id="postal_code"
              name="postal_code"
              type="text"
              className={inputClass}
            />
          </Field>
        </FormSection>
        <FormActions>
          <button
            type="button"
            onClick={() => router.back()}
            className={secondaryBtnClass}
          >
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className={primaryBtnClass}>
            {isPending ? "Guardando..." : "Crear Consignatario"}
          </button>
        </FormActions>
      </form>
    </FormCard>
  );
}
