"use client";

import { useEffect, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { getAllCountries } from "@/lib/actions/locations";

interface CountryOption {
  isoCode: string;
  name: string;
  flag: string;
}

interface CountryComboboxProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (isoCode: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** If provided, only these countries are shown (e.g. destination countries). Otherwise loads all countries. */
  countries?: CountryOption[];
}

export function CountryCombobox({
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Seleccionar país...",
  required,
  disabled,
  id,
  countries: externalCountries,
}: CountryComboboxProps) {
  const [loadedCountries, setLoadedCountries] = useState<CountryOption[]>([]);

  useEffect(() => {
    if (externalCountries) return;
    getAllCountries().then((list) => setLoadedCountries(list));
  }, [externalCountries]);

  const countries = externalCountries ?? loadedCountries;
  const options = countries.map((c) => ({
    value: c.isoCode,
    label: `${c.flag} ${c.name} (${c.isoCode})`.trim(),
  }));

  return (
    <Combobox
      id={id}
      name={name}
      options={options}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder={options.length === 0 ? "Cargando..." : placeholder}
      required={required}
      disabled={disabled || options.length === 0}
    />
  );
}
