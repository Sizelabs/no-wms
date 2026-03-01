"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
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
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Nombre
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
      </div>
      <div>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-gray-700"
        >
          Código
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          placeholder="MIA"
        />
      </div>
      <div>
        <label
          htmlFor="country"
          className="block text-sm font-medium text-gray-700"
        >
          País
        </label>
        <select
          id="country"
          value={countryCode}
          onChange={(e) => handleCountryChange(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          <option value="">Seleccionar...</option>
          {countries.map((c) => (
            <option key={c.isoCode} value={c.isoCode}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>
      {states.length > 0 && (
        <div>
          <label
            htmlFor="state"
            className="block text-sm font-medium text-gray-700"
          >
            Estado / Provincia
          </label>
          <select
            id="state"
            value={stateCode}
            onChange={(e) => handleStateChange(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            <option value="">Seleccionar...</option>
            {states.map((s) => (
              <option key={s.isoCode} value={s.isoCode}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {(cities.length > 0 || (countryCode && states.length === 0)) && (
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-700"
          >
            Ciudad
          </label>
          <select
            id="city"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            <option value="">Seleccionar...</option>
            {cities.map((ci, i) => (
              <option key={`${ci.name}-${i}`} value={ci.name}>
                {ci.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label
          htmlFor="timezone"
          className="block text-sm font-medium text-gray-700"
        >
          Zona Horaria
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          required
          disabled={!countryCode}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-100"
        >
          {timezones.map((tz) => (
            <option key={tz.zoneName} value={tz.zoneName}>
              {tz.zoneName} ({tz.gmtOffsetName})
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("loading") : t("create")}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
