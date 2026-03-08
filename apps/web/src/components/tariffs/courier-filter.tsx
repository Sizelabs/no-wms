"use client";

import { usePathname, useRouter } from "next/navigation";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";

interface CourierFilterProps {
  couriers: { id: string; name: string; code: string }[];
  selectedCourierId?: string;
  /** When true, the user is courier-scoped — hide "Tarifa Base (todos)" option */
  isCourierScoped?: boolean;
}

export function CourierFilter({ couriers, selectedCourierId, isCourierScoped }: CourierFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Hide filter entirely if courier-scoped with only one courier
  if (isCourierScoped && couriers.length <= 1) return null;

  const handleChange = (values: string[]) => {
    // Take the most recently added value for navigation
    const value = values.length > 0 ? values[values.length - 1] : undefined;
    if (value) {
      router.push(`${pathname}?courier=${value}`);
    } else {
      router.push(pathname);
    }
  };

  const options = couriers.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.code})`,
  }));
  if (!isCourierScoped) {
    options.unshift({ value: "", label: "Tarifa Base (todos)" });
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">Ver tarifas de:</label>
      <MultiSelectFilter
        label="Tarifa Base (todos)"
        options={options}
        selected={selectedCourierId ? [selectedCourierId] : []}
        onChange={handleChange}
      />
      {selectedCourierId && (
        <span className="text-xs text-gray-500">
          Los valores personalizados se muestran con etiqueta
        </span>
      )}
    </div>
  );
}
