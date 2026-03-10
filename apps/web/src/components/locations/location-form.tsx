"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass, primaryBtnClass, secondaryBtnClass, Field } from "@/components/ui/form-section";
import { createLocation, updateLocation } from "@/lib/actions/location-management";

interface Location {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at?: string | null;
  max_packages: number | null;
  max_weight_lb: number | null;
  max_length_in: number | null;
  max_width_in: number | null;
  max_height_in: number | null;
  preferred_agency_id: string | null;
  [key: string]: unknown;
}

interface Props {
  location: Location | null; // null = create mode
  zoneId: string;
  onDone: () => void;
  onCancel: () => void;
}

export function LocationForm({ location, zoneId, onDone, onCancel }: Props) {
  const isEdit = location !== null;
  const [name, setName] = useState(location?.name ?? "");
  const [code, setCode] = useState(location?.code ?? "");
  const [maxPackages, setMaxPackages] = useState<string>(location?.max_packages?.toString() ?? "");
  const [maxWeightLb, setMaxWeightLb] = useState<string>(location?.max_weight_lb?.toString() ?? "");
  const [maxLengthIn, setMaxLengthIn] = useState<string>(location?.max_length_in?.toString() ?? "");
  const [maxWidthIn, setMaxWidthIn] = useState<string>(location?.max_width_in?.toString() ?? "");
  const [maxHeightIn, setMaxHeightIn] = useState<string>(location?.max_height_in?.toString() ?? "");
  const [isActive, setIsActive] = useState(location?.is_active ?? true);
  const [isBlocked, setIsBlocked] = useState(location?.is_blocked ?? false);
  const [blockedReason, setBlockedReason] = useState(location?.blocked_reason ?? "");
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (isEdit && location) {
        const result = await updateLocation(location.id, {
          name,
          code,
          is_active: isActive,
          is_blocked: isBlocked,
          blocked_reason: isBlocked ? blockedReason || null : null,
          max_packages: maxPackages ? Number(maxPackages) : null,
          max_weight_lb: maxWeightLb ? Number(maxWeightLb) : null,
          max_length_in: maxLengthIn ? Number(maxLengthIn) : null,
          max_width_in: maxWidthIn ? Number(maxWidthIn) : null,
          max_height_in: maxHeightIn ? Number(maxHeightIn) : null,
        });
        if (result.error) {
          notify(result.error, "error");
          return;
        }
        notify("Ubicación actualizada", "success");
      } else {
        const result = await createLocation({
          zone_id: zoneId,
          name,
          code,
          max_packages: maxPackages ? Number(maxPackages) : null,
          max_weight_lb: maxWeightLb ? Number(maxWeightLb) : null,
          max_length_in: maxLengthIn ? Number(maxLengthIn) : null,
          max_width_in: maxWidthIn ? Number(maxWidthIn) : null,
          max_height_in: maxHeightIn ? Number(maxHeightIn) : null,
        });
        if (result.error) {
          notify(result.error, "error");
          return;
        }
        notify("Ubicación creada", "success");
      }
      onDone();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {isEdit ? "Editar ubicación" : "Nueva ubicación"}
          </h3>
          <button type="button" onClick={onCancel} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <Field label="Nombre" required>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="A01-101" required />
          </Field>
          <Field label="Código" required hint="Letras mayúsculas, números, guiones">
            <input
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="A01-101"
              pattern="^[A-Z0-9\-]+$"
              maxLength={20}
              required
            />
          </Field>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-medium text-gray-500 uppercase">Capacidad</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Máx. paquetes">
                <input type="number" className={inputClass} value={maxPackages} onChange={(e) => setMaxPackages(e.target.value)} min={1} placeholder="Sin límite" />
              </Field>
              <Field label="Máx. peso (lb)">
                <input type="number" className={inputClass} value={maxWeightLb} onChange={(e) => setMaxWeightLb(e.target.value)} min={0} step="0.01" placeholder="Sin límite" />
              </Field>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-medium text-gray-500 uppercase">Dimensiones máximas (pulgadas)</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Largo">
                <input type="number" className={inputClass} value={maxLengthIn} onChange={(e) => setMaxLengthIn(e.target.value)} min={0} step="0.01" />
              </Field>
              <Field label="Ancho">
                <input type="number" className={inputClass} value={maxWidthIn} onChange={(e) => setMaxWidthIn(e.target.value)} min={0} step="0.01" />
              </Field>
              <Field label="Alto">
                <input type="number" className={inputClass} value={maxHeightIn} onChange={(e) => setMaxHeightIn(e.target.value)} min={0} step="0.01" />
              </Field>
            </div>
          </div>

          {isEdit && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Activa
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={isBlocked} onChange={(e) => setIsBlocked(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Bloqueada
              </label>
              {isBlocked && (
                <Field label="Razón de bloqueo">
                  <input className={inputClass} value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} placeholder="Rack dañado, limpieza, etc." maxLength={200} />
                </Field>
              )}
            </div>
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
