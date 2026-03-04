"use client";

import { Truck } from "lucide-react";
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
import { updateCourrier } from "@/lib/actions/courriers";

interface Courrier {
  id: string;
  name: string;
  code: string;
  type: string;
  ruc: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
}

interface CourrierEditFormProps {
  courrier: Courrier;
}

export function CourrierEditForm({ courrier }: CourrierEditFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateCourrier(courrier.id, formData);
        router.back();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al actualizar courrier",
          "error",
        );
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Courrier" icon={Truck}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" htmlFor="name" required>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={courrier.name}
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
                defaultValue={courrier.code}
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
                defaultValue={courrier.type}
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
                defaultValue={courrier.ruc ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Dirección" htmlFor="address">
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={courrier.address ?? ""}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ciudad" htmlFor="city">
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={courrier.city ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="País" htmlFor="country">
              <input
                id="country"
                name="country"
                type="text"
                defaultValue={courrier.country ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Teléfono" htmlFor="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={courrier.phone ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={courrier.email ?? ""}
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
