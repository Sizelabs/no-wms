export const COURIER_TYPES = {
  CORPORATIVO: "corporativo",
  BOX: "box",
} as const;

export type CourierType = (typeof COURIER_TYPES)[keyof typeof COURIER_TYPES];

export const COURIER_TYPE_LABELS: Record<CourierType, string> = {
  corporativo: "Corporativo",
  box: "Box",
};
