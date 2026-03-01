export const AGENCY_TYPES = {
  CORPORATIVO: "corporativo",
  BOX: "box",
} as const;

export type AgencyType = (typeof AGENCY_TYPES)[keyof typeof AGENCY_TYPES];

export const AGENCY_TYPE_LABELS: Record<AgencyType, string> = {
  corporativo: "Corporativo",
  box: "Box",
};
