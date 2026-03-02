import { z } from "zod";

export const createWarehouseReceiptSchema = z.object({
  warehouse_id: z.string().uuid(),
  agency_id: z.string().uuid().nullable().optional(),
  tracking_number: z.string().min(1, "Número de guía requerido"),
  carrier: z.string().min(1, "Transportista requerido"),
  consignee_id: z.string().uuid().nullable().optional(),
  actual_weight_lb: z.coerce.number().positive("Peso debe ser mayor a 0").optional(),
  length_in: z.coerce.number().positive().optional(),
  width_in: z.coerce.number().positive().optional(),
  height_in: z.coerce.number().positive().optional(),
  content_description: z.string().optional(),
  is_dgr: z.boolean().default(false),
  dgr_class: z.string().optional(),
  dgr_checklist_completed: z.array(z.string()).optional(),
  is_damaged: z.boolean().default(false),
  damage_description: z.string().optional(),
  warehouse_location_id: z.string().uuid().optional(),
  sender_name: z.string().optional(),
  pieces_count: z.coerce.number().int().positive().default(1),
  notes: z.string().optional(),
  client_id: z.string().optional(),
}).refine(
  (data) => !data.is_damaged || (data.damage_description && data.damage_description.length > 0),
  { message: "Descripción de daño requerida", path: ["damage_description"] },
);

export type CreateWarehouseReceiptInput = z.infer<typeof createWarehouseReceiptSchema>;

export const createConsigneeSchema = z.object({
  agency_id: z.string().uuid(),
  full_name: z.string().min(1, "Nombre requerido"),
  cedula_ruc: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
});

export type CreateConsigneeInput = z.infer<typeof createConsigneeSchema>;

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
