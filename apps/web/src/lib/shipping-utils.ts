/** Derive house bill document_type from SI modality (supports both legacy text and DB codes) */
export function getDocumentType(modality: string): "hawb" | "hbl" | "hwb" {
  if (modality === "lcl" || modality === "fcl" || modality === "maritima") return "hbl";
  if (modality === "terrestre") return "hwb";
  // courier, aerea, courier_a–g, air_cargo, and any other → hawb
  return "hawb";
}

const DOC_TYPE_TO_SHIPMENT_MODALITY: Record<string, "air" | "ocean" | "ground"> = {
  hawb: "air",
  hbl: "ocean",
  hwb: "ground",
};

export const SHIPMENT_MODALITY_TO_DOC_TYPE: Record<string, "hawb" | "hbl" | "hwb"> = {
  air: "hawb",
  ocean: "hbl",
  ground: "hwb",
};

/** Map an SI modality code to a shipment modality (air, ocean, ground) */
export function getShipmentModality(modalityCode: string): "air" | "ocean" | "ground" {
  const docType = getDocumentType(modalityCode);
  return DOC_TYPE_TO_SHIPMENT_MODALITY[docType] ?? "air";
}

/** Selected SI for shipment creation flows */
export interface SelectedSI {
  id: string;
  si_number: string;
  modality_code: string;
}

/** Extract the modality code from a Supabase SI row (handles the `as unknown as` cast) */
export function extractModalityCode(si: { modality?: string | null; modalities?: unknown }): string {
  const m = si.modalities as { code: string } | { code: string }[] | null | undefined;
  if (m == null) return si.modality ?? "";
  const obj = Array.isArray(m) ? m[0] : m;
  return obj?.code ?? si.modality ?? "";
}
