"use client";

import { MapPin, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import {
  disabledInputClass,
  Field,
  FormActions,
  FormCard,
  FormSection,
  inputClass,
  primaryBtnClass,
  secondaryBtnClass,
} from "@/components/ui/form-section";
import { updateConsignee } from "@/lib/actions/consignees";

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

interface ConsigneeEditFormProps {
  consignee: Consignee;
}

export function ConsigneeEditForm({ consignee }: ConsigneeEditFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateConsignee(consignee.id, formData);
      if (result.error) {
        notify(result.error, "error");
      } else {
        router.back();
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Identificación" icon={User}>
          <Field label="Agencia" htmlFor="agency">
            <input
              id="agency"
              type="text"
              disabled
              value={consignee.agencies ? `${consignee.agencies.name} (${consignee.agencies.code})` : "—"}
              className={disabledInputClass}
            />
          </Field>
          <Field label="Casillero" htmlFor="casillero">
            <input
              id="casillero"
              name="casillero"
              type="text"
              defaultValue={consignee.casillero}
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
                defaultValue={consignee.full_name}
                className={inputClass}
              />
            </Field>
            <Field label="Cédula/RUC" htmlFor="cedula_ruc">
              <input
                id="cedula_ruc"
                name="cedula_ruc"
                type="text"
                defaultValue={consignee.cedula_ruc ?? ""}
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
                defaultValue={consignee.email ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Teléfono" htmlFor="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={consignee.phone ?? ""}
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
              defaultValue={consignee.address_line1 ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Dirección línea 2" htmlFor="address_line2">
            <input
              id="address_line2"
              name="address_line2"
              type="text"
              defaultValue={consignee.address_line2 ?? ""}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Ciudad" htmlFor="city">
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={consignee.city ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Provincia" htmlFor="province">
              <input
                id="province"
                name="province"
                type="text"
                defaultValue={consignee.province ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Código postal" htmlFor="postal_code">
              <input
                id="postal_code"
                name="postal_code"
                type="text"
                defaultValue={consignee.postal_code ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
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
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </FormActions>
      </form>
    </FormCard>
  );
}
