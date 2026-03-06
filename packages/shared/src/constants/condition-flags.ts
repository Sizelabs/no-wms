export const CONDITION_FLAGS = [
  "sin_novedad",
  "caja_danada",
  "caja_abierta",
  "cinta_rota",
  "caja_mojada",
  "contenido_expuesto",
] as const;

export type ConditionFlag = (typeof CONDITION_FLAGS)[number];

export const CONDITION_FLAG_LABELS_ES: Record<ConditionFlag, string> = {
  sin_novedad: "Sin novedad",
  caja_danada: "Caja dañada",
  caja_abierta: "Caja abierta",
  cinta_rota: "Cinta rota",
  caja_mojada: "Caja mojada",
  contenido_expuesto: "Contenido expuesto",
};

export const CONDITION_FLAG_LABELS_EN: Record<ConditionFlag, string> = {
  sin_novedad: "No exceptions",
  caja_danada: "Damaged box",
  caja_abierta: "Open box",
  cinta_rota: "Broken tape",
  caja_mojada: "Wet box",
  contenido_expuesto: "Exposed contents",
};

export const CONDITION_FLAG_COLORS: Record<ConditionFlag, string> = {
  sin_novedad: "bg-green-50 text-green-700",
  caja_danada: "bg-amber-50 text-amber-700",
  caja_abierta: "bg-amber-50 text-amber-700",
  cinta_rota: "bg-amber-50 text-amber-700",
  caja_mojada: "bg-red-50 text-red-700",
  contenido_expuesto: "bg-red-50 text-red-700",
};
