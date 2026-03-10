"use client";

import { ZONE_TYPE_LABELS, ZONE_TYPE_COLORS } from "@no-wms/shared/constants/locations";
import type { ZoneType } from "@no-wms/shared/constants/locations";
import { Edit2, Trash2, MapPin } from "lucide-react";

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
  zones: Zone[];
  selectedZoneId: string | null;
  onSelect: (id: string) => void;
  onEdit: (zone: Zone) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  isPending: boolean;
}

export function ZoneList({ zones, selectedZoneId, onSelect, onEdit, onDelete, canEdit, canDelete, isPending }: Props) {
  if (zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <MapPin className="h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          {isPending ? "Cargando..." : "No hay zonas configuradas"}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {zones.map((zone) => {
        const isSelected = zone.id === selectedZoneId;
        const typeLabel = ZONE_TYPE_LABELS[zone.zone_type as ZoneType] ?? zone.zone_type;
        const typeColor = ZONE_TYPE_COLORS[zone.zone_type as ZoneType] ?? "bg-gray-100 text-gray-700";

        return (
          <div
            key={zone.id}
            role="button"
            tabIndex={0}
            className={`w-full px-4 py-3 text-left transition-colors cursor-pointer hover:bg-gray-50 ${
              isSelected ? "bg-gray-50 border-l-2 border-gray-900" : ""
            } ${!zone.is_active ? "opacity-50" : ""}`}
            onClick={() => onSelect(zone.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(zone.id); } }}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{zone.name}</span>
                  <span className="text-xs text-gray-400">{zone.code}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor}`}>
                    {typeLabel}
                  </span>
                  <span className="text-xs text-gray-400">
                    {zone.location_count} ubicaciones
                  </span>
                </div>
              </div>

              {isSelected && (canEdit || canDelete) && (
                <div className="flex items-center gap-1 ml-2">
                  {canEdit && (
                    <button
                      type="button"
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(zone);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canDelete && zone.location_count === 0 && (
                    <button
                      type="button"
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("¿Eliminar esta zona?")) onDelete(zone.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
