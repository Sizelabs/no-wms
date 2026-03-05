"use client";

import { UserPlus } from "lucide-react";
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
import { inviteUser } from "@/lib/actions/users";

interface InviteAgencyUserFormProps {
  organizationId: string;
  agencyId: string;
}

export function InviteAgencyUserForm({
  organizationId,
  agencyId,
}: InviteAgencyUserFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = fd.get("full_name") as string;
    const email = fd.get("email") as string;

    startTransition(async () => {
      const result = await inviteUser(organizationId, fullName, email, "agency", {
        agency_id: agencyId,
      });
      if (result?.error) {
        notify(result.error, "error");
      } else {
        router.back();
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Usuario" icon={UserPlus}>
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
            <Field
              label="Correo electrónico"
              htmlFor="email"
              required
              hint="Se le enviará una invitación para configurar su contraseña."
            >
              <input
                id="email"
                name="email"
                type="email"
                required
                className={inputClass}
              />
            </Field>
          </div>
          <p className="text-sm text-gray-500">
            El usuario será asignado con el rol <strong>Agencia Subcourier</strong>.
          </p>
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
            {isPending ? t("loading") : "Enviar Invitación"}
          </button>
        </FormActions>
      </form>
    </FormCard>
  );
}
