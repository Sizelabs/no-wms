"use client";

import { Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { CityTypeahead } from "@/components/ui/city-typeahead";
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
import type { CitySearchResult } from "@/lib/actions/locations";
import {
  getTimezoneForCoordinates,
  getTimezonesOfCountry,
} from "@/lib/actions/locations";
import { updateWarehouse } from "@/lib/actions/warehouses";

interface TimezoneOption {
  zoneName: string;
  gmtOffsetName: string;
}

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
  const [timezone, setTimezone] = useState(warehouse.timezone);
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [code, setCode] = useState(warehouse.code);

  function handleCitySelect(result: CitySearchResult | null) {
    if (!result) {
      setTimezones([]);
      return;
    }
    getTimezonesOfCountry(result.countryCode).then((tz) => {
      setTimezones(tz);
    });
    if (result.longitude) {
      getTimezoneForCoordinates(result.countryCode, result.longitude).then((tz) => {
        if (tz) setTimezone(tz);
      });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("timezone", timezone);
    startTransition(async () => {
      try {
        await updateWarehouse(warehouse.id, formData);
        notify("Bodega actualizada", "success");
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
            <Field label="Identificador" htmlFor="code" required hint="Cambiar este código solo afectará recibos nuevos. Los existentes conservarán su número actual.">
              <input
                id="code"
                name="code"
                type="text"
                required
                maxLength={5}
                pattern="[A-Za-z]{2,5}"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Ubicación" htmlFor="location_city" required>
            <CityTypeahead
              id="location_city"
              defaultCity={warehouse.city ?? ""}
              defaultCountry={warehouse.country ?? ""}
              countryFieldName="country"
              countryCodeFieldName={null}
              stateFieldName={null}
              onSelect={handleCitySelect}
              required
            />
          </Field>
          <Field label="Zona Horaria" htmlFor="timezone" required>
            {timezones.length > 0 ? (
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
                className={selectClass}
              >
                {timezones.map((tz) => (
                  <option key={tz.zoneName} value={tz.zoneName}>
                    {tz.zoneName} ({tz.gmtOffsetName})
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="timezone"
                type="text"
                readOnly
                value={timezone}
                className={inputClass}
              />
            )}
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
