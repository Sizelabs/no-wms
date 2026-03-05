import { z } from "zod";

// ── Shipping Categories ──

export const createShippingCategorySchema = z.object({
  country_code: z.string().length(2, "Código de país debe ser 2 caracteres (ISO 3166-1)"),
  code: z.string().min(1, "Código requerido").max(10),
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  display_order: z.number().int().min(0).optional(),
});

export const updateShippingCategorySchema = z.object({
  country_code: z.string().length(2).optional(),
  code: z.string().min(1).max(10).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export type CreateShippingCategoryInput = z.infer<typeof createShippingCategorySchema>;
export type UpdateShippingCategoryInput = z.infer<typeof updateShippingCategorySchema>;

// ── Tariff Schedules ──

export const createTariffScheduleSchema = z.object({
  tariff_side: z.enum(["forwarder_to_courier", "courier_to_agency"]),
  tariff_type: z.enum(["shipping", "work_order"]),
  courier_id: z.string().uuid().optional().nullable(),
  agency_id: z.string().uuid().optional().nullable(),
  destination_id: z.string().uuid().optional().nullable(),
  modality: z.enum([
    "courier_a", "courier_b", "courier_c", "courier_d",
    "courier_e", "courier_f", "courier_g", "air_cargo",
  ]).optional().nullable(),
  shipping_category_id: z.string().uuid().optional().nullable(),
  work_order_type: z.string().optional().nullable(),
  base_fee: z.number().min(0).optional().default(0),
  weight_unit: z.enum(["kg", "lb", "volumetric"]).default("kg"),
  volumetric_divisor: z.number().positive().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  effective_from: z.string().min(1, "Fecha de inicio requerida"),
  effective_to: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.tariff_type === "shipping") {
      return !!data.destination_id && !data.work_order_type;
    }
    return !!data.work_order_type && !data.destination_id && !data.shipping_category_id && !data.modality;
  },
  { message: "Campos inválidos para el tipo de tarifa", path: ["tariff_type"] },
).refine(
  (data) => data.tariff_side !== "courier_to_agency" || !!data.courier_id,
  { message: "courier_id requerido para courier→agencia", path: ["courier_id"] },
).refine(
  (data) => !data.agency_id || data.tariff_side === "courier_to_agency",
  { message: "agency_id solo permitido en courier→agencia", path: ["agency_id"] },
).refine(
  (data) => data.weight_unit !== "volumetric" || !!data.volumetric_divisor,
  { message: "Divisor volumétrico requerido", path: ["volumetric_divisor"] },
);

export const updateTariffScheduleSchema = z.object({
  tariff_side: z.enum(["forwarder_to_courier", "courier_to_agency"]).optional(),
  tariff_type: z.enum(["shipping", "work_order"]).optional(),
  courier_id: z.string().uuid().optional().nullable(),
  agency_id: z.string().uuid().optional().nullable(),
  destination_id: z.string().uuid().optional().nullable(),
  modality: z.enum([
    "courier_a", "courier_b", "courier_c", "courier_d",
    "courier_e", "courier_f", "courier_g", "air_cargo",
  ]).optional().nullable(),
  shipping_category_id: z.string().uuid().optional().nullable(),
  work_order_type: z.string().optional().nullable(),
  base_fee: z.number().min(0).optional(),
  weight_unit: z.enum(["kg", "lb", "volumetric"]).optional(),
  volumetric_divisor: z.number().positive().optional().nullable(),
  currency: z.string().length(3).optional(),
  effective_from: z.string().optional(),
  effective_to: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export type CreateTariffScheduleInput = z.infer<typeof createTariffScheduleSchema>;
export type UpdateTariffScheduleInput = z.infer<typeof updateTariffScheduleSchema>;

// ── Tariff Brackets ──

export const createTariffBracketSchema = z.object({
  min_weight: z.number().min(0, "Peso mínimo debe ser >= 0"),
  max_weight: z.number().positive("Peso máximo requerido"),
  rate_per_unit: z.number().positive("Tarifa por unidad requerida"),
  minimum_charge: z.number().min(0).optional().default(0),
}).refine(
  (data) => data.max_weight > data.min_weight,
  { message: "Peso máximo debe ser mayor al mínimo", path: ["max_weight"] },
);

export type CreateTariffBracketInput = z.infer<typeof createTariffBracketSchema>;
