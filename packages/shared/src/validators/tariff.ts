import { z } from "zod";

// ── Handling Costs ──

export const createHandlingCostSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
});

export const updateHandlingCostSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export type CreateHandlingCostInput = z.infer<typeof createHandlingCostSchema>;
export type UpdateHandlingCostInput = z.infer<typeof updateHandlingCostSchema>;

// ── Modalities ──

export const createModalitySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  code: z.string().min(1, "Código requerido").max(20, "Código máximo 20 caracteres"),
  description: z.string().optional(),
});

export const updateModalitySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(20).optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export type CreateModalityInput = z.infer<typeof createModalitySchema>;
export type UpdateModalityInput = z.infer<typeof updateModalitySchema>;

// ── Tariff Schedules ──

export const createTariffScheduleSchema = z.object({
  warehouse_id: z.string().uuid("Bodega requerida"),
  handling_cost_id: z.string().uuid("Costo de manejo requerido"),
  destination_id: z.string().uuid().optional().nullable(),
  agency_id: z.string().uuid().optional().nullable(),
  courier_id: z.string().uuid().optional().nullable(),
  rate: z.number().min(0, "Tarifa debe ser >= 0"),
  rate_unit: z.enum(["flat", "per_kg", "per_lb", "per_cbm", "per_shipment"]),
  minimum_charge: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).default("USD"),
  effective_from: z.string().min(1, "Fecha de inicio requerida"),
  effective_to: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => !data.agency_id || !!data.courier_id,
  { message: "Courier requerido cuando se especifica agencia", path: ["courier_id"] },
);

export const updateTariffScheduleSchema = z.object({
  warehouse_id: z.string().uuid().optional(),
  handling_cost_id: z.string().uuid().optional(),
  destination_id: z.string().uuid().optional().nullable(),
  agency_id: z.string().uuid().optional().nullable(),
  courier_id: z.string().uuid().optional().nullable(),
  rate: z.number().min(0).optional(),
  rate_unit: z.enum(["flat", "per_kg", "per_lb", "per_cbm", "per_shipment"]).optional(),
  minimum_charge: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  effective_from: z.string().optional(),
  effective_to: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export type CreateTariffScheduleInput = z.infer<typeof createTariffScheduleSchema>;
export type UpdateTariffScheduleInput = z.infer<typeof updateTariffScheduleSchema>;
