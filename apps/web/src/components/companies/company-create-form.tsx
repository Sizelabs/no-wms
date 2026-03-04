"use client";

import { Building2, UserPlus } from "lucide-react";
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
} from "@/components/ui/form-section";
import { createOrganization } from "@/lib/actions/organizations";

export function CompanyCreateForm() {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createOrganization(formData);
        router.back();
      } catch (err) {
        notify(err instanceof Error ? err.message : "Error al crear empresa", "error");
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Empresa" icon={Building2}>
          <Field label="Nombre de la Empresa" htmlFor="name" required>
            <input
              id="name"
              name="name"
              type="text"
              required
              className={inputClass}
            />
          </Field>
          <Field label="URL del Logo" htmlFor="logo_url">
            <input
              id="logo_url"
              name="logo_url"
              type="url"
              className={inputClass}
            />
          </Field>
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
