export const DOCUMENT_TYPES = {
  COMMERCIAL_INVOICE: "commercial_invoice",
  PACKING_LIST: "packing_list",
  POWER_OF_ATTORNEY: "power_of_attorney",
  CEDULA_COPY: "cedula_copy",
  RUC_COPY: "ruc_copy",
  INEN_CERTIFICATE: "inen_certificate",
  SPECIAL_PERMIT: "special_permit",
  OTHER: "other",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  commercial_invoice: "Factura Comercial",
  packing_list: "Lista de Empaque",
  power_of_attorney: "Poder de Autorización",
  cedula_copy: "Copia de Cédula",
  ruc_copy: "Copia de RUC",
  inen_certificate: "Certificado INEN",
  special_permit: "Permiso Especial",
  other: "Otro",
};

export const CARGO_TYPES = {
  DOCUMENTS_ONLY: "documents_only",
  GENERAL: "general",
  DANGEROUS_GOODS: "dangerous_goods",
} as const;

export type CargoType = (typeof CARGO_TYPES)[keyof typeof CARGO_TYPES];

export const CARGO_TYPE_LABELS: Record<CargoType, string> = {
  documents_only: "Solo Documentos",
  general: "General",
  dangerous_goods: "Mercancía Peligrosa",
};

export const CUSTOMS_DECLARATION_TYPES = {
  NONE: "none",
  SIMPLIFIED: "simplified",
  FORMAL: "formal",
} as const;

export type CustomsDeclarationType = (typeof CUSTOMS_DECLARATION_TYPES)[keyof typeof CUSTOMS_DECLARATION_TYPES];

export const CUSTOMS_DECLARATION_LABELS: Record<CustomsDeclarationType, string> = {
  none: "Ninguna",
  simplified: "Simplificada",
  formal: "Formal (DAI)",
};

/** Ecuador-specific keys for country_specific_rules JSONB */
export const EC_RULES = {
  CONSUMES_CUPO_4X4: "consumes_cupo_4x4",
} as const;
