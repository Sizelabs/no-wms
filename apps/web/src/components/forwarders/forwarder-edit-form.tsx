"use client";

import { Building2 } from "lucide-react";
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
import { updateOrganization } from "@/lib/actions/organizations";

interface Forwarder {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ForwarderEditFormProps {
  forwarder: Forwarder;
}

export function ForwarderEditForm({ forwarder }: ForwarderEditFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateOrganization(forwarder.id, formData);
        notify("Freight forwarder actualizado", "success");
        router.back();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al actualizar freight forwarder",
          "error",
        );
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Freight Forwarder" icon={Building2}>
          <Field label="Nombre del Freight Forwarder" htmlFor="name" required>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={forwarder.name}
              className={inputClass}
            />
          </Field>
          <Field label="URL del Logo" htmlFor="logo_url">
            <input
              id="logo_url"
              name="logo_url"
              type="url"
              defaultValue={forwarder.logo_url ?? ""}
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
