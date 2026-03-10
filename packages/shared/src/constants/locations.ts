// ── Zone types ──
export const ZONE_TYPES = {
  RECEIVING: "receiving",
  PUTAWAY: "putaway",
  STORAGE: "storage",
  WORK_ORDER: "work_order",
  STAGING: "staging",
  QUARANTINE: "quarantine",
  DAMAGED: "damaged",
} as const;

export type ZoneType = (typeof ZONE_TYPES)[keyof typeof ZONE_TYPES];

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  receiving: "Recepción",
  putaway: "Putaway",
  storage: "Almacenaje",
  work_order: "Orden de Trabajo",
  staging: "Despacho",
  quarantine: "Cuarentena",
  damaged: "Dañados",
};

export const ZONE_TYPE_COLORS: Record<ZoneType, string> = {
  receiving: "bg-blue-100 text-blue-700",
  putaway: "bg-cyan-100 text-cyan-700",
  storage: "bg-emerald-100 text-emerald-700",
  work_order: "bg-amber-100 text-amber-700",
  staging: "bg-purple-100 text-purple-700",
  quarantine: "bg-orange-100 text-orange-700",
  damaged: "bg-red-100 text-red-700",
};

/** Zone types that use structured aisle/rack/shelf/position codes */
export const HIERARCHICAL_ZONE_TYPES: ZoneType[] = ["storage"];

/** Default zones every warehouse should have (created on warehouse setup) */
export const DEFAULT_WAREHOUSE_ZONES: Array<{ name: string; code: string; zone_type: ZoneType; sort_order: number }> = [
  { name: "Recepción", code: "REC", zone_type: "receiving", sort_order: 1 },
  { name: "Putaway", code: "PUT", zone_type: "putaway", sort_order: 2 },
  { name: "Almacenaje", code: "ALM", zone_type: "storage", sort_order: 3 },
  { name: "Orden de Trabajo", code: "WO", zone_type: "work_order", sort_order: 4 },
  { name: "Despacho", code: "DES", zone_type: "staging", sort_order: 5 },
  { name: "Cuarentena", code: "QUA", zone_type: "quarantine", sort_order: 6 },
  { name: "Dañados", code: "DMG", zone_type: "damaged", sort_order: 7 },
];

// ── Movement types ──
export const MOVEMENT_TYPES = {
  RECEIVE: "receive",
  PUTAWAY: "putaway",
  PICK: "pick",
  RELOCATE: "relocate",
  STAGE: "stage",
  DISPATCH: "dispatch",
  QUARANTINE: "quarantine",
  DAMAGE: "damage",
  RETURN_TO_STORAGE: "return_to_storage",
} as const;

export type MovementType = (typeof MOVEMENT_TYPES)[keyof typeof MOVEMENT_TYPES];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  receive: "Recepción",
  putaway: "Ubicación",
  pick: "Picking",
  relocate: "Reubicación",
  stage: "Staging",
  dispatch: "Despacho",
  quarantine: "Cuarentena",
  damage: "Daño",
  return_to_storage: "Retorno a Almacén",
};

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  receive: "bg-blue-100 text-blue-700",
  putaway: "bg-emerald-100 text-emerald-700",
  pick: "bg-amber-100 text-amber-700",
  relocate: "bg-cyan-100 text-cyan-700",
  stage: "bg-purple-100 text-purple-700",
  dispatch: "bg-gray-100 text-gray-700",
  quarantine: "bg-orange-100 text-orange-700",
  damage: "bg-red-100 text-red-700",
  return_to_storage: "bg-teal-100 text-teal-700",
};
