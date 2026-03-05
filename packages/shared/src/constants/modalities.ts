/**
 * Default modality codes seeded for every organization.
 * Modalities are now DB-driven — this file exists as a reference
 * for the default set.
 *
 * The old hardcoded MODALITIES/MODALITY_LABELS/MVP_MODALITIES are
 * kept as deprecated exports for shipping-instruction components
 * that still use them. Those will be migrated to DB-driven modalities
 * in a future phase.
 */
export const DEFAULT_MODALITY_CODES = ["aerea", "maritima", "courier", "terrestre"] as const;
export type DefaultModalityCode = (typeof DEFAULT_MODALITY_CODES)[number];

export const DEFAULT_MODALITY_LABELS: Record<DefaultModalityCode, string> = {
  aerea: "Aérea",
  maritima: "Marítima",
  courier: "Courier",
  terrestre: "Terrestre",
};

// ── Deprecated exports (used by shipping-instruction components) ──

/** @deprecated Use DB-driven modalities instead */
export const MODALITIES = {
  COURIER_A: "courier_a",
  COURIER_B: "courier_b",
  COURIER_C: "courier_c",
  COURIER_D: "courier_d",
  COURIER_E: "courier_e",
  COURIER_F: "courier_f",
  COURIER_G: "courier_g",
  AIR_CARGO: "air_cargo",
  LCL: "lcl",
  FCL: "fcl",
} as const;

/** @deprecated Use DB-driven modalities instead */
export type Modality = (typeof MODALITIES)[keyof typeof MODALITIES];

/** @deprecated Use DB-driven modalities instead */
export const MODALITY_LABELS: Record<Modality, string> = {
  courier_a: "Courier Cat. A",
  courier_b: "Courier Cat. B",
  courier_c: "Courier Cat. C",
  courier_d: "Courier Cat. D",
  courier_e: "Courier Cat. E",
  courier_f: "Courier Cat. F",
  courier_g: "Courier Cat. G",
  air_cargo: "Carga Aérea",
  lcl: "LCL (Marítimo)",
  fcl: "FCL (Marítimo)",
};

/** @deprecated Use DB-driven modalities instead */
export const MVP_MODALITIES: Modality[] = [
  "courier_a",
  "courier_b",
  "courier_c",
  "courier_d",
  "courier_e",
  "courier_f",
  "courier_g",
  "air_cargo",
];
