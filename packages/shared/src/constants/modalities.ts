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

export type Modality = (typeof MODALITIES)[keyof typeof MODALITIES];

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

/** Modalities available in MVP (Phase 1) */
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
