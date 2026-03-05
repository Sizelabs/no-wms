import { z } from "zod";

export const createCourierSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  code: z.string().min(1, "Código requerido").max(10),
  type: z.enum(["corporativo", "box"]).default("corporativo"),
  ruc: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export type CreateCourierInput = z.infer<typeof createCourierSchema>;

export const updateCourierSchema = z.object({
  name: z.string().min(1, "Nombre requerido").optional(),
  code: z.string().min(1).max(10).optional(),
  type: z.enum(["corporativo", "box"]).optional(),
  ruc: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});

export type UpdateCourierInput = z.infer<typeof updateCourierSchema>;

export const createCourierWarehouseSchema = z.object({
  courier_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
});

export type CreateCourierWarehouseInput = z.infer<typeof createCourierWarehouseSchema>;

export const createCourierWarehouseDestinationSchema = z.object({
  courier_warehouse_id: z.string().uuid(),
  destination_id: z.string().uuid(),
  base_rate: z.number().min(0).optional(),
  rate_per_kg: z.number().min(0).optional(),
  transit_days: z.number().int().min(0).optional(),
  cutoff_day_of_week: z.number().int().min(0).max(6).optional(),
  currency_code: z.string().length(3).default("USD"),
  notes: z.string().optional(),
});

export type CreateCourierWarehouseDestinationInput = z.infer<typeof createCourierWarehouseDestinationSchema>;
