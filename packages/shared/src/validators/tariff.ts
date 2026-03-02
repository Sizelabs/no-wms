import { z } from "zod";

export const createTariffScheduleSchema = z.object({
  agency_id: z.string().uuid("Agencia requerida"),
  destination_country_id: z.string().uuid("País destino requerido"),
  modality: z.enum([
    "courier_a", "courier_b", "courier_c", "courier_d",
    "courier_e", "courier_f", "courier_g", "air_cargo",
  ]),
  courier_category: z.string().optional(),
  effective_from: z.string().min(1, "Fecha de inicio requerida"),
  effective_to: z.string().optional(),
});

export const updateTariffScheduleSchema = createTariffScheduleSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const createTariffRateSchema = z.object({
  schedule_id: z.string().uuid(),
  min_weight_lb: z.number().min(0, "Peso mínimo debe ser >= 0"),
  max_weight_lb: z.number().positive("Peso máximo requerido"),
  rate_per_lb: z.number().positive("Tarifa por libra requerida"),
  minimum_charge: z.number().min(0).optional(),
}).refine(
  (data) => data.max_weight_lb > data.min_weight_lb,
  { message: "Peso máximo debe ser mayor al mínimo", path: ["max_weight_lb"] },
);

export const updateTariffRateSchema = z.object({
  min_weight_lb: z.number().min(0).optional(),
  max_weight_lb: z.number().positive().optional(),
  rate_per_lb: z.number().positive().optional(),
  minimum_charge: z.number().min(0).optional(),
});

export type CreateTariffScheduleInput = z.infer<typeof createTariffScheduleSchema>;
export type CreateTariffRateInput = z.infer<typeof createTariffRateSchema>;
