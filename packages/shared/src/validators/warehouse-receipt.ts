import { z } from "zod";

import { PACKAGE_TYPES } from "../constants/package-types";

export const createPackageSchema = z.object({
  tracking_number: z.string().min(1, "Número de guía requerido"),
  carrier: z.string().min(1, "Transportista requerido"),
  actual_weight_lb: z.coerce.number().positive("Peso debe ser mayor a 0").optional(),
  length_in: z.coerce.number().positive().optional(),
  width_in: z.coerce.number().positive().optional(),
  height_in: z.coerce.number().positive().optional(),
  content_description: z.string().optional(),
  declared_value_usd: z.coerce.number().nonnegative().optional(),
  is_dgr: z.boolean().default(false),
  dgr_class: z.string().optional(),
  is_damaged: z.boolean().default(false),
  damage_description: z.string().optional(),
  sender_name: z.string().optional(),
  pieces_count: z.coerce.number().int().positive().default(1),
  package_type: z.enum(PACKAGE_TYPES).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => !data.is_damaged || (data.damage_description && data.damage_description.length > 0),
  { message: "Descripción de daño requerida", path: ["damage_description"] },
);

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const createWarehouseReceiptSchema = z.object({
  warehouse_id: z.string().uuid(),
  agency_id: z.string().uuid().nullable().optional(),
  consignee_id: z.string().uuid().nullable().optional(),
  warehouse_location_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  client_id: z.string().optional(),
  shipper_name: z.string().optional(),
  master_tracking: z.string().optional(),
  description: z.string().optional(),
  wr_number: z.string().optional(),
  packages: z.array(createPackageSchema).min(1, "Al menos un paquete requerido"),
});

export type CreateWarehouseReceiptInput = z.infer<typeof createWarehouseReceiptSchema>;

export { createConsigneeSchema } from "./consignee";
export type { CreateConsigneeInput } from "./consignee";

export const unknownWrClaimSchema = z.object({
  unknown_wr_id: z.string().uuid(),
  tracking_number: z.string().min(1, "Número de guía requerido para reclamar"),
});

export type UnknownWrClaimInput = z.infer<typeof unknownWrClaimSchema>;

/** Calculate volumetric weight from dimensions */
export function calculateVolumetricWeight(
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  dimensionalFactor: number,
): number {
  return (lengthIn * widthIn * heightIn) / dimensionalFactor;
}

/** Get billable weight = max(actual, volumetric) */
export function calculateBillableWeight(
  actualWeightLb: number | undefined | null,
  volumetricWeightLb: number | undefined | null,
): number {
  const actual = actualWeightLb ?? 0;
  const volumetric = volumetricWeightLb ?? 0;
  return Math.max(actual, volumetric);
}
