"use client";

import { usePathname, useRouter } from "next/navigation";

import { filterSelectClass } from "@/components/ui/form-section";

interface CourierFilterProps {
  couriers: { id: string; name: string; code: string }[];
  selectedCourierId?: string;
}

export function CourierFilter({ couriers, selectedCourierId }: CourierFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      router.push(`${pathname}?courier=${value}`);
    } else {
      router.push(pathname);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">Ver tarifas de:</label>
      <select
        value={selectedCourierId ?? ""}
        onChange={handleChange}
        className={filterSelectClass + " min-w-[200px]"}
      >
        <option value="">Tarifa Base (todos)</option>
        {couriers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.code})
          </option>
        ))}
      </select>
      {selectedCourierId && (
        <span className="text-xs text-gray-500">
          Los valores personalizados se muestran con etiqueta
        </span>
      )}
    </div>
  );
}
