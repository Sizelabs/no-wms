"use client";

import { Combobox } from "@/components/ui/combobox";
import { AIRPORTS } from "@no-wms/shared/constants/airports";

interface AirportComboboxProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iata: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export function AirportCombobox({ ...props }: AirportComboboxProps) {
  const options = AIRPORTS.map((a) => ({
    value: a.iata,
    label: `${a.iata} - ${a.name}, ${a.city} (${a.country})`,
  }));

  return (
    <Combobox
      options={options}
      placeholder="Buscar aeropuerto..."
      {...props}
    />
  );
}
