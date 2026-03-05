"use client";

import { Warehouse } from "lucide-react";
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
import type { CityOption, Country } from "@/components/ui/location-selects";
import { LocationSelects } from "@/components/ui/location-selects";
import {
  getTimezoneForCoordinates,
  getTimezonesOfCountry,
} from "@/lib/actions/locations";
import { createWarehouse } from "@/lib/actions/warehouses";

interface TimezoneOption {
  zoneName: string;
  gmtOffsetName: string;
}

interface WarehouseCreateFormProps {
  organizationId: string;
  countries: Country[];
}

export function WarehouseCreateForm({
  organizationId,
  countries,
}: WarehouseCreateFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState("America/New_York");
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);

  function handleCityChange(city: CityOption | null, countryCode: string) {
    if (!countryCode) {
      setTimezones([]);
      return;
    }
    // Load timezones for country
    getTimezonesOfCountry(countryCode).then((tz) => {
      setTimezones(tz);
      const firstTz = tz[0];
      if (firstTz) setTimezone(firstTz.zoneName);
    });
    // If city has coordinates, pick best timezone
    if (city?.longitude) {
      getTimezoneForCoordinates(countryCode, city.longitude).then((tz) => {
        if (tz) setTimezone(tz);
      });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("organization_id", organizationId);
    formData.set("timezone", timezone);
    startTransition(async () => {
      try {
        await createWarehouse(formData);
        router.back();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al crear bodega",
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
                className={inputClass}
              />
            </Field>
            <Field label="Código" htmlFor="code" required>
              <input
                id="code"
                name="code"
                type="text"
                required
                placeholder="MIA"
                className={inputClass}
              />
            </Field>
          </div>
          <LocationSelects
            countries={countries}
            required
            onCityChange={handleCityChange}
          />
          <Field label="Zona Horaria" htmlFor="timezone" required>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              disabled={timezones.length === 0}
              className={`${selectClass} disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-500`}
            >
              {timezones.map((tz) => (
                <option key={tz.zoneName} value={tz.zoneName}>
                  {tz.zoneName} ({tz.gmtOffsetName})
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
            {isPending ? t("loading") : t("create")}
          </button>
        </FormActions>
      </form>
    </FormCard>
  );
}
