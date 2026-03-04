"use client";

import { User } from "lucide-react";
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
import { updateUserProfile } from "@/lib/actions/users";

interface UserData {
  id: string;
  full_name: string;
  phone: string | null;
}

interface UserEditFormProps {
  user: UserData;
}

export function UserEditForm({ user }: UserEditFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateUserProfile(user.id, formData);
        router.back();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al actualizar usuario",
          "error",
        );
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Usuario" icon={User}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre completo" htmlFor="full_name" required>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                defaultValue={user.full_name}
                className={inputClass}
              />
            </Field>
            <Field label="Teléfono" htmlFor="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
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
            {isPending ? t("loading") : t("save")}
          </button>
        </FormActions>
      </form>
    </FormCard>
  );
}
