"use client";

import { Warehouse } from "lucide-react";
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
import { updateWarehouse } from "@/lib/actions/warehouses";

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  timezone: string;
}

interface WarehouseEditFormProps {
  warehouse: WarehouseData;
}

export function WarehouseEditForm({ warehouse }: WarehouseEditFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateWarehouse(warehouse.id, formData);
        router.back();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al actualizar bodega",
          "error",
        );
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Bodega" icon={Warehouse}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" htmlFor="name" required>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={warehouse.name}
                className={inputClass}
              />
            </Field>
            <Field label="Código" htmlFor="code" required>
              <input
                id="code"
                name="code"
                type="text"
                required
                defaultValue={warehouse.code}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ciudad" htmlFor="city">
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={warehouse.city ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="País" htmlFor="country">
              <input
                id="country"
                name="country"
                type="text"
                defaultValue={warehouse.country ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Zona Horaria" htmlFor="timezone" required>
            <input
              id="timezone"
              name="timezone"
              type="text"
              required
              defaultValue={warehouse.timezone}
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
