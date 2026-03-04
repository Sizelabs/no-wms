"use client";

import { Store, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import {
  checkboxClass,
  disabledInputClass,
  Field,
  FormActions,
  FormCard,
  FormSection,
  inputClass,
  primaryBtnClass,
  secondaryBtnClass,
  selectClass,
} from "@/components/ui/form-section";
import { createAgencyWithAdmin } from "@/lib/actions/agencies";

interface Courrier {
  id: string;
  name: string;
  code: string;
}

interface DestinationCountry {
  id: string;
  name: string;
  code: string;
}

interface AgencyCreateFormProps {
  organizationId: string;
  courriers: Courrier[];
  destinationCountries: DestinationCountry[];
  defaultCourrierId?: string;
  lockCourrier?: boolean;
}

export function AgencyCreateForm({
  organizationId,
  courriers,
  destinationCountries,
  defaultCourrierId,
  lockCourrier,
}: AgencyCreateFormProps) {
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
        await createAgencyWithAdmin(formData);
        router.back();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al crear agencia",
          "error",
        );
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Agencia" icon={Store}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Courrier" htmlFor="courrier_id" required>
              <select
                id="courrier_id"
                name="courrier_id"
                required
                defaultValue={defaultCourrierId ?? ""}
                disabled={lockCourrier}
                className={lockCourrier ? disabledInputClass : selectClass}
              >
                <option value="" disabled>Seleccionar courrier</option>
                {courriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {lockCourrier && defaultCourrierId && (
                <input type="hidden" name="courrier_id" value={defaultCourrierId} />
              )}
            </Field>
            <Field label="País destino" htmlFor="destination_country_id" required>
              <select
                id="destination_country_id"
                name="destination_country_id"
                required
                className={selectClass}
              >
                <option value="" disabled>Seleccionar país</option>
                {destinationCountries.map((dc) => (
                  <option key={dc.id} value={dc.id}>
                    {dc.name} ({dc.code})
                  </option>
                ))}
              </select>
            </Field>
          </div>
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
            <Field label="Código" htmlFor="code" required>
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
          <div className="flex items-center gap-2 pt-1">
            <input
              id="allow_multi_package"
              name="allow_multi_package"
              type="checkbox"
              defaultChecked
              className={checkboxClass}
            />
            <label htmlFor="allow_multi_package" className="text-sm text-gray-600">
              Permitir múltiples paquetes por recibo
            </label>
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
