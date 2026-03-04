"use client";

import { Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

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
import {
  getCitiesOfState,
  getStatesOfCountry,
  getTimezonesOfCountry,
} from "@/lib/actions/locations";
import { createWarehouse } from "@/lib/actions/warehouses";

interface Country {
  name: string;
  isoCode: string;
  flag: string;
}

interface StateOption {
  name: string;
  isoCode: string;
}

interface CityOption {
  name: string;
}

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
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [cityName, setCityName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");

  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);

  const selectedCountry = countries.find((c) => c.isoCode === countryCode);

  useEffect(() => {
    if (!countryCode) {
      setStates([]);
      setCities([]);
      setTimezones([]);
      return;
    }
    Promise.all([
      getStatesOfCountry(countryCode),
      getTimezonesOfCountry(countryCode),
    ]).then(([s, tz]) => {
      setStates(s);
      setTimezones(tz);
      const firstTz = tz[0];
      if (firstTz) setTimezone(firstTz.zoneName);
    });
  }, [countryCode]);

  useEffect(() => {
    if (!countryCode || !stateCode) {
      setCities([]);
      return;
    }
    getCitiesOfState(countryCode, stateCode).then(setCities);
  }, [countryCode, stateCode]);

  function handleCountryChange(code: string) {
    setCountryCode(code);
    setStateCode("");
    setCityName("");
  }

  function handleStateChange(code: string) {
    setStateCode(code);
    setCityName("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("organization_id", organizationId);
    formData.set("country", selectedCountry?.name ?? "");
    formData.set("city", cityName);
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
          <Field label="País" htmlFor="country" required>
            <select
              id="country"
              value={countryCode}
              onChange={(e) => handleCountryChange(e.target.value)}
              required
              className={selectClass}
            >
              <option value="">Seleccionar...</option>
              {countries.map((c) => (
                <option key={c.isoCode} value={c.isoCode}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </Field>
          {states.length > 0 && (
            <Field label="Estado / Provincia" htmlFor="state" required>
              <select
                id="state"
                value={stateCode}
                onChange={(e) => handleStateChange(e.target.value)}
                required
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.isoCode}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {(cities.length > 0 || (countryCode && states.length === 0)) && (
            <Field label="Ciudad" htmlFor="city" required>
              <select
                id="city"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                required
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {cities.map((ci, i) => (
                  <option key={`${ci.name}-${i}`} value={ci.name}>
                    {ci.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Zona Horaria" htmlFor="timezone" required>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              disabled={!countryCode}
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
