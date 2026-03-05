"use client";

import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

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
import { inviteUser } from "@/lib/actions/users";

const COURIER_ROLES = ["destination_admin", "destination_operator"] as const;

interface InviteCourierUserFormProps {
  organizationId: string;
  courierId: string;
}

export function InviteCourierUserForm({
  organizationId,
  courierId,
}: InviteCourierUserFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<string>(COURIER_ROLES[0]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = fd.get("full_name") as string;
    const email = fd.get("email") as string;

    startTransition(async () => {
      const result = await inviteUser(organizationId, fullName, email, selectedRole, {
        courier_id: courierId,
      });
      if (result?.error) {
        notify(result.error, "error");
      } else {
        notify("Invitación enviada", "success");
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
          <Field label="Rol" htmlFor="role" required>
            <select
              id="role"
              name="role"
              required
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={selectClass}
            >
              {COURIER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
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
