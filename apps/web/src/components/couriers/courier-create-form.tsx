"use client";

import { Truck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import {
  Field,
  FormActions,
  FormCard,
  FormSection,
  inputClass,
  primaryBtnClass,
  secondaryBtnClass,
  selectClass,
} from "@/components/ui/form-section";
import type { Country } from "@/components/ui/location-selects";
import { LocationSelects } from "@/components/ui/location-selects";
import { createCourier } from "@/lib/actions/couriers";

interface CourierCreateFormProps {
  organizationId: string;
  countries: Country[];
}

export function CourierCreateForm({ organizationId, countries }: CourierCreateFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("organization_id", organizationId);
    startTransition(async () => {
      try {
        await createCourier(formData);
        notify("Courier creado", "success");
        router.back();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al crear courier",
          "error",
        );
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Courier" icon={Truck}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" htmlFor="name" required>
              <input
                id="name"
                name="name"
                type="text"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Identificador" htmlFor="code" required>
              <input
                id="code"
                name="code"
                type="text"
                required
                maxLength={10}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo" htmlFor="type" required>
              <select
                id="type"
                name="type"
                required
                className={selectClass}
              >
                <option value="corporativo">Corporativo</option>
                <option value="box">Box</option>
              </select>
            </Field>
            <Field label="RUC" htmlFor="ruc">
              <input
                id="ruc"
                name="ruc"
                type="text"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Dirección" htmlFor="address">
            <input
              id="address"
              name="address"
              type="text"
              className={inputClass}
            />
          </Field>
          <LocationSelects countries={countries} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Teléfono" htmlFor="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                className={inputClass}
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>
        <FormSection title="Administrador" icon={UserPlus}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre completo" htmlFor="admin_name" required>
              <input
                id="admin_name"
                name="admin_name"
                type="text"
                required
                className={inputClass}
              />
            </Field>
            <Field
              label="Correo electrónico"
              htmlFor="admin_email"
              required
              hint="Se le enviará una invitación para configurar su contraseña."
            >
              <input
                id="admin_email"
                name="admin_email"
                type="email"
                required
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
            {t("cancel")}
          </button>
          <button type="submit" disabled={isPending} className={primaryBtnClass}>
            {isPending ? t("loading") : t("create")}
          </button>
        </FormActions>
      </form>
    </FormCard>
  );
}
