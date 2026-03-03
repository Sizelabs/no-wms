import { z } from "zod";

export const createCourrierSchema = z.object({
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

export type CreateCourrierInput = z.infer<typeof createCourrierSchema>;

export const updateCourrierSchema = z.object({
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

export type UpdateCourrierInput = z.infer<typeof updateCourrierSchema>;

export const createCourrierCoverageSchema = z.object({
  courrier_id: z.string().uuid(),
  destination_country_id: z.string().uuid(),
  city: z.string().optional(),
});

export type CreateCourrierCoverageInput = z.infer<typeof createCourrierCoverageSchema>;
