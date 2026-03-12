export const SHIPMENT_MODALITIES = {
  AIR: "air",
  OCEAN: "ocean",
  GROUND: "ground",
} as const;

export type ShipmentModality = (typeof SHIPMENT_MODALITIES)[keyof typeof SHIPMENT_MODALITIES];

export const SHIPMENT_MODALITY_LABELS: Record<ShipmentModality, string> = {
  air: "Aéreo",
  ocean: "Marítimo",
  ground: "Terrestre",
};

export const CONTAINER_TYPES = [
  "20ft",
  "40ft",
  "40hq",
  "45ft",
  "reefer_20",
  "reefer_40",
] as const;

export type ContainerType = (typeof CONTAINER_TYPES)[number];

export const CONTAINER_TYPE_LABELS: Record<ContainerType, string> = {
  "20ft": "20' Standard",
  "40ft": "40' Standard",
  "40hq": "40' High Cube",
  "45ft": "45' High Cube",
  reefer_20: "20' Refrigerado",
  reefer_40: "40' Refrigerado",
};

export const FREIGHT_TERMS = ["prepaid", "collect"] as const;

export type FreightTerms = (typeof FREIGHT_TERMS)[number];

export const FREIGHT_TERMS_LABELS: Record<FreightTerms, string> = {
  prepaid: "Prepagado",
  collect: "Por Cobrar",
};

export const DOCUMENT_TYPES = {
  HAWB: "hawb",
  HBL: "hbl",
  HWB: "hwb",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  hawb: "HAWB",
  hbl: "HBL",
  hwb: "HWB",
};
