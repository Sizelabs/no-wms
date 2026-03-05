export const RATE_UNITS = {
  FLAT: "flat",
  PER_KG: "per_kg",
  PER_LB: "per_lb",
  PER_CBM: "per_cbm",
  PER_MAWB: "per_mawb",
  PER_HAWB: "per_hawb",
} as const;

export type RateUnit = (typeof RATE_UNITS)[keyof typeof RATE_UNITS];

export const RATE_UNIT_LABELS: Record<RateUnit, string> = {
  flat: "Tarifa fija",
  per_kg: "Por kg",
  per_lb: "Por lb",
  per_cbm: "Por m³",
  per_mawb: "Por MAWB",
  per_hawb: "Por HAWB",
};

export const CURRENCIES = ["USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
