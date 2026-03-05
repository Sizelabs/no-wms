export const TARIFF_SIDES = {
  FORWARDER_TO_COURIER: "forwarder_to_courier",
  COURIER_TO_AGENCY: "courier_to_agency",
} as const;

export type TariffSide = (typeof TARIFF_SIDES)[keyof typeof TARIFF_SIDES];

export const TARIFF_SIDE_LABELS: Record<TariffSide, string> = {
  forwarder_to_courier: "Forwarder → Courier",
  courier_to_agency: "Courier → Agencia",
};

export const TARIFF_TYPES = {
  SHIPPING: "shipping",
  WORK_ORDER: "work_order",
} as const;

export type TariffType = (typeof TARIFF_TYPES)[keyof typeof TARIFF_TYPES];

export const TARIFF_TYPE_LABELS: Record<TariffType, string> = {
  shipping: "Envío",
  work_order: "Orden de Trabajo",
};

export const WEIGHT_UNITS = {
  KG: "kg",
  LB: "lb",
  VOLUMETRIC: "volumetric",
} as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[keyof typeof WEIGHT_UNITS];

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  kg: "Kilogramos (kg)",
  lb: "Libras (lb)",
  volumetric: "Volumétrico",
};
