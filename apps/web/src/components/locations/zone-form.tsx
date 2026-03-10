"use client";

import { ZONE_TYPES, ZONE_TYPE_LABELS } from "@no-wms/shared/constants/locations";
import type { ZoneType } from "@no-wms/shared/constants/locations";
import { X } from "lucide-react";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass, selectClass, primaryBtnClass, secondaryBtnClass, Field } from "@/components/ui/form-section";
import { createZone, updateZone } from "@/lib/actions/location-management";

interface Zone {
  id: string;
  name: string;
  code: string;
  zone_type: string;
  is_active: boolean;
  sort_order: number;
  warehouse_id: string;
  updated_at: string;
  location_count: number;
}

interface Props {
  zone: Zone | null; // null = create mode
  warehouseId: string;
  onDone: () => void;
  onCancel: () => void;
}

export function ZoneForm({ zone, warehouseId, onDone, onCancel }: Props) {
  const isEdit = zone !== null;
  const [name, setName] = useState(zone?.name ?? "");
  const [code, setCode] = useState(zone?.code ?? "");
  const [zoneType, setZoneType] = useState<string>(zone?.zone_type ?? "storage");
  const [isActive, setIsActive] = useState(zone?.is_active ?? true);
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (isEdit && zone) {
        const result = await updateZone(zone.id, { name, code, zone_type: zoneType as ZoneType, is_active: isActive });
        if (result.error) {
          notify(result.error, "error");
          return;
        }
        notify("Zona actualizada", "success");
      } else {
        const result = await createZone({ warehouse_id: warehouseId, name, code, zone_type: zoneType as ZoneType });
        if (result.error) {
          notify(result.error, "error");
          return;
        }
        notify("Zona creada", "success");
      }
      onDone();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {isEdit ? "Editar zona" : "Nueva zona"}
          </h3>
          <button type="button" onClick={onCancel} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <Field label="Nombre" required>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Zona Almacenaje"
              required
            />
          </Field>
          <Field label="Código" required hint="Letras mayúsculas, números, guiones bajos">
            <input
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ALM"
              pattern="^[A-Z0-9_]+$"
              maxLength={10}
              required
            />
          </Field>
          <Field label="Tipo de zona" required>
            <select
              className={selectClass}
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value)}
            >
              {Object.values(ZONE_TYPES).map((t) => (
                <option key={t} value={t}>
                  {ZONE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Activa
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={secondaryBtnClass} onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className={primaryBtnClass} disabled={isPending}>
              {isPending ? "Guardando..." : isEdit ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
