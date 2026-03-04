"use client";

import type { AgencyType } from "@no-wms/shared/constants/agency-types";
import { AGENCY_TYPE_LABELS } from "@no-wms/shared/constants/agency-types";
import { Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import {
  checkboxClass,
  Field,
  FormActions,
  FormCard,
  FormSection,
  inputClass,
  primaryBtnClass,
  secondaryBtnClass,
  selectClass,
} from "@/components/ui/form-section";
import { updateAgency } from "@/lib/actions/agencies";

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

interface AgencyEditFormProps {
  agency: Agency;
}

const AGENCY_TYPES: AgencyType[] = ["corporativo", "box"];

export function AgencyEditForm({ agency }: AgencyEditFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateAgency(agency.id, formData);
        router.back();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al actualizar agencia",
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
            <Field label="Nombre" htmlFor="name" required>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={agency.name}
                className={inputClass}
              />
            </Field>
            <Field label="Código" htmlFor="code" required>
              <input
                id="code"
                name="code"
                type="text"
                required
                defaultValue={agency.code}
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
                defaultValue={agency.type}
                className={selectClass}
              >
                {AGENCY_TYPES.map((at) => (
                  <option key={at} value={at}>
                    {AGENCY_TYPE_LABELS[at]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="RUC" htmlFor="ruc">
              <input
                id="ruc"
                name="ruc"
                type="text"
                defaultValue={agency.ruc ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Dirección" htmlFor="address">
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={agency.address ?? ""}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Teléfono" htmlFor="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={agency.phone ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={agency.email ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              id="allow_multi_package"
              name="allow_multi_package"
              type="checkbox"
              defaultChecked={agency.allow_multi_package}
              className={checkboxClass}
            />
            <label htmlFor="allow_multi_package" className="text-sm text-gray-600">
              Permitir múltiples paquetes por recibo
            </label>
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
            {isPending ? t("loading") : t("save")}
          </button>
        </FormActions>
      </form>
    </FormCard>
  );
}
