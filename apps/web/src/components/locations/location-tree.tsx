"use client";

import { Edit2, Trash2, Lock, Unlock, Package, MapPin } from "lucide-react";

interface Location {
  id: string;
  name: string;
  code: string;
  barcode: string;
  is_active: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  current_count: number;
  max_packages: number | null;
  max_weight_lb: number | null;
  max_length_in: number | null;
  max_width_in: number | null;
  max_height_in: number | null;
  preferred_agency_id: string | null;
  sort_order: number;
  warehouse_id: string;
  zone_id: string;
  updated_at: string;
}

interface Zone {
  id: string;
  name: string;
  code: string;
  zone_type: string;
}

interface Props {
  locations: Location[];
  selectedZone: Zone | null;
  onEdit: (location: Location) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  isPending: boolean;
}

export function LocationTree({ locations, selectedZone, onEdit, onDelete, canEdit, canDelete, isPending }: Props) {
  if (!selectedZone) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <MapPin className="h-10 w-10 text-gray-200" />
        <p className="mt-3 text-sm text-gray-400">Selecciona una zona para ver sus ubicaciones</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Package className="h-10 w-10 text-gray-200" />
        <p className="mt-3 text-sm text-gray-400">
          {isPending ? "Cargando ubicaciones..." : "No hay ubicaciones en esta zona"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
            <th className="px-4 py-2.5">Código</th>
            <th className="px-4 py-2.5">Barcode</th>
            <th className="px-4 py-2.5 text-center">Paquetes</th>
            <th className="px-4 py-2.5 text-center">Estado</th>
            {(canEdit || canDelete) && <th className="px-4 py-2.5 w-20" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {locations.map((loc) => {
            const capacityText = loc.max_packages
              ? `${loc.current_count}/${loc.max_packages}`
              : String(loc.current_count);
            const isOverCapacity = loc.max_packages !== null && loc.current_count >= loc.max_packages;

            return (
              <tr
                key={loc.id}
                className={`hover:bg-gray-50 transition-colors ${!loc.is_active ? "opacity-50" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <span className="font-mono text-sm font-medium text-gray-900">{loc.code}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs text-gray-400">{loc.barcode}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-sm ${isOverCapacity ? "font-semibold text-red-600" : "text-gray-700"}`}>
                    {capacityText}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {loc.is_blocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700" title={loc.blocked_reason ?? ""}>
                      <Lock className="h-3 w-3" />
                      Bloqueada
                    </span>
                  ) : !loc.is_active ? (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      Inactiva
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <Unlock className="h-3 w-3" />
                      Disponible
                    </span>
                  )}
                </td>
                {(canEdit || canDelete) && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          onClick={() => onEdit(loc)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && loc.current_count === 0 && (
                        <button
                          type="button"
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => {
                            if (confirm("¿Eliminar esta ubicación?")) onDelete(loc.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
