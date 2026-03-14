"use client";

import { useEffect, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { getAllCountries } from "@/lib/actions/locations";

interface CountryComboboxProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (isoCode: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
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
}: CountryComboboxProps) {
  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    getAllCountries().then((list) =>
      setCountries(list.map((c) => ({ value: c.isoCode, label: `${c.flag} ${c.name} (${c.isoCode})` }))),
    );
  }, []);

  return (
    <Combobox
      id={id}
      name={name}
      options={countries}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder={countries.length === 0 ? "Cargando..." : placeholder}
      required={required}
      disabled={disabled || countries.length === 0}
    />
  );
}
