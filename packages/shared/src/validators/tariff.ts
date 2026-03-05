import { z } from "zod";

export const createTariffScheduleSchema = z.object({
  agency_id: z.string().uuid("Agencia requerida").optional(),
  destination_id: z.string().uuid("Destino requerido"),
  courier_warehouse_destination_id: z.string().uuid().optional(),
  modality: z.enum([
    "courier_a", "courier_b", "courier_c", "courier_d",
    "courier_e", "courier_f", "courier_g", "air_cargo",
  ]),
  courier_category: z.string().optional(),
  rate_type: z.enum(["courier_cost", "agency_rate"]).default("agency_rate"),
  effective_from: z.string().min(1, "Fecha de inicio requerida"),
  effective_to: z.string().optional(),
  min_weight_kg: z.number().min(0, "Peso mínimo debe ser >= 0"),
  max_weight_kg: z.number().positive("Peso máximo requerido"),
  rate_per_kg: z.number().positive("Tarifa por kg requerida"),
  minimum_charge: z.number().min(0).optional(),
}).refine(
  (data) => data.max_weight_kg > data.min_weight_kg,
  { message: "Peso máximo debe ser mayor al mínimo", path: ["max_weight_kg"] },
).refine(
  (data) => (data.rate_type === "courier_cost" && !data.agency_id) ||
            (data.rate_type === "agency_rate" && !!data.agency_id),
  { message: "agency_id requerido para agency_rate, debe ser nulo para courier_cost", path: ["agency_id"] },
);

export const updateTariffScheduleSchema = z.object({
  agency_id: z.string().uuid().optional().nullable(),
  destination_id: z.string().uuid().optional(),
  courier_warehouse_destination_id: z.string().uuid().optional().nullable(),
  modality: z.enum([
    "courier_a", "courier_b", "courier_c", "courier_d",
    "courier_e", "courier_f", "courier_g", "air_cargo",
  ]).optional(),
  courier_category: z.string().optional(),
  rate_type: z.enum(["courier_cost", "agency_rate"]).optional(),
  effective_from: z.string().optional(),
  effective_to: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  min_weight_kg: z.number().min(0).optional(),
  max_weight_kg: z.number().positive().optional(),
  rate_per_kg: z.number().positive().optional(),
  minimum_charge: z.number().min(0).optional(),
});

export type CreateTariffScheduleInput = z.infer<typeof createTariffScheduleSchema>;
export type UpdateTariffScheduleInput = z.infer<typeof updateTariffScheduleSchema>;
