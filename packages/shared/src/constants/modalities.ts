/**
 * Default modality codes seeded for every organization.
 * Modalities are now DB-driven — this file exists as a reference
 * for the default set used by the org-creation trigger and seed script.
 */
export const DEFAULT_MODALITY_CODES = ["aerea", "maritima", "courier", "terrestre"] as const;
export type DefaultModalityCode = (typeof DEFAULT_MODALITY_CODES)[number];

export const DEFAULT_MODALITY_LABELS: Record<DefaultModalityCode, string> = {
  aerea: "Aérea",
  maritima: "Marítima",
  courier: "Courier",
  terrestre: "Terrestre",
};
