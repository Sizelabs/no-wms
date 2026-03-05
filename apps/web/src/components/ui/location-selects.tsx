"use client";

import { useEffect, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/form-section";
import {
  findStateByCity,
  getCitiesOfState,
  getStatesOfCountry,
} from "@/lib/actions/locations";

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
  latitude: string | null | undefined;
  longitude: string | null | undefined;
}

interface LocationSelectsProps {
  countries: Country[];
  defaultCountryName?: string;
  defaultStateName?: string;
  defaultCityName?: string;
  /** Field name for country hidden input (default: "country") */
  countryFieldName?: string;
  /** Field name for state hidden input (default: none — no hidden input rendered) */
  stateFieldName?: string;
  /** Field name for city hidden input (default: "city") */
  cityFieldName?: string;
  /** Label for the state field (default: "Estado / Provincia") */
  stateLabel?: string;
  /** Whether country is required (default: false) */
  required?: boolean;
  /** Callback when city changes — provides city data for timezone lookups etc. */
  onCityChange?: (city: CityOption | null, countryCode: string) => void;
}

export function LocationSelects({
  countries,
  defaultCountryName,
  defaultStateName,
  defaultCityName,
  countryFieldName = "country",
  stateFieldName,
  cityFieldName = "city",
  stateLabel = "Estado / Provincia",
  required = false,
  onCityChange,
}: LocationSelectsProps) {
  // Resolve default country code from name
  const defaultCountry = defaultCountryName
    ? countries.find((c) => c.name === defaultCountryName)
    : undefined;

  const [countryCode, setCountryCode] = useState(defaultCountry?.isoCode ?? "");
  const [stateCode, setStateCode] = useState("");
  const [cityName, setCityName] = useState(defaultCityName ?? "");

  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [initialized, setInitialized] = useState(false);

  const selectedCountry = countries.find((c) => c.isoCode === countryCode);

  // Load states when country changes
  useEffect(() => {
    if (!countryCode) {
      setStates([]);
      setCities([]);
      return;
    }
    getStatesOfCountry(countryCode).then((s) => {
      setStates(s);
      if (!initialized && defaultStateName) {
        // Resolve state code from name
        const match = s.find((st) => st.name === defaultStateName);
        if (match) {
          setStateCode(match.isoCode);
        }
      } else if (!initialized && !defaultStateName && defaultCityName) {
        // No state stored — find which state contains the default city
        findStateByCity(countryCode, defaultCityName).then((found) => {
          if (found) {
            setStateCode(found.isoCode);
          }
        });
      }
    });
  }, [countryCode]); // intentionally omit initialized + defaults to only run on country change

  // Load cities when state changes
  useEffect(() => {
    if (!countryCode || !stateCode) {
      setCities([]);
      return;
    }
    getCitiesOfState(countryCode, stateCode).then((c) => {
      setCities(c);
      setInitialized(true);
    });
  }, [countryCode, stateCode]);

  function handleCountryChange(code: string) {
    setCountryCode(code);
    setStateCode("");
    setCityName("");
    onCityChange?.(null, code);
  }

  function handleStateChange(code: string) {
    setStateCode(code);
    setCityName("");
    onCityChange?.(null, countryCode);
  }

  function handleCityChange(name: string) {
    setCityName(name);
    const city = cities.find((c) => c.name === name) ?? null;
    onCityChange?.(city, countryCode);
  }

  const selectedState = states.find((s) => s.isoCode === stateCode);

  return (
    <>
      {/* Hidden inputs for form submission */}
      <input type="hidden" name={countryFieldName} value={selectedCountry?.name ?? ""} />
      <input type="hidden" name={cityFieldName} value={cityName} />
      {stateFieldName && (
        <input type="hidden" name={stateFieldName} value={selectedState?.name ?? ""} />
      )}

      <Field label="País" htmlFor="location_country" required={required}>
        <Combobox
          id="location_country"
          options={countries.map((c) => ({ value: c.isoCode, label: `${c.name} ${c.flag}` }))}
          value={countryCode}
          onChange={handleCountryChange}
          required={required}
          placeholder="Seleccionar..."
        />
      </Field>

      {states.length > 0 && (
        <Field label={stateLabel} htmlFor="location_state" required={required}>
          <Combobox
            id="location_state"
            options={states.map((s) => ({ value: s.isoCode, label: s.name }))}
            value={stateCode}
            onChange={handleStateChange}
            required={required}
            placeholder="Seleccionar..."
          />
        </Field>
      )}

      {(cities.length > 0 || (countryCode && states.length === 0)) && (
        <Field label="Ciudad" htmlFor="location_city" required={required}>
          <Combobox
            id="location_city"
            options={cities.map((ci) => ({ value: ci.name, label: ci.name }))}
            value={cityName}
            onChange={handleCityChange}
            required={required}
            placeholder="Seleccionar..."
          />
        </Field>
      )}
    </>
  );
}

export type { Country, StateOption, CityOption };
