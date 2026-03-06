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

export const upsertCourierDestinationSchema = z.object({
  courier_id: z.string().uuid(),
  destination_id: z.string().uuid(),
  is_active: z.boolean(),
});

export type UpsertCourierDestinationInput = z.infer<typeof upsertCourierDestinationSchema>;
