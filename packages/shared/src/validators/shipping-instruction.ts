import { z } from "zod";

/** Validates Ecuadorian cédula (10 digits) or RUC (13 digits) */
const cedulaRucSchema = z.string().refine(
  (val) => /^\d{10}$/.test(val) || /^\d{13}$/.test(val),
  "Cédula (10 dígitos) o RUC (13 dígitos) inválido",
);

export const createShippingInstructionSchema = z.object({
  warehouse_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  destination_country_id: z.string().uuid(),
  modality: z.enum([
    "courier_a", "courier_b", "courier_c", "courier_d",
    "courier_e", "courier_f", "courier_g", "air_cargo",
  ]),
  courier_category: z.string().optional(),
  consignee_id: z.string().uuid(),
  warehouse_receipt_ids: z.array(z.string().uuid()).min(1, "Seleccione al menos un WR"),
  // Ecuador-specific
  cedula_ruc: cedulaRucSchema.optional(),
  cupo_4x4_used: z.boolean().default(false),
  // SED data
  sed_validation_data: z.any().optional(),
  // Additional
  special_instructions: z.string().optional(),
});

export const additionalChargeSchema = z.object({
  description: z.string().min(1, "Descripción requerida"),
  amount: z.number().positive("Monto debe ser positivo"),
});

export const addAdditionalChargesSchema = z.object({
  shipping_instruction_id: z.string().uuid(),
  charges: z.array(additionalChargeSchema).min(1),
});

export type CreateShippingInstructionInput = z.infer<typeof createShippingInstructionSchema>;
export type AdditionalCharge = z.infer<typeof additionalChargeSchema>;
