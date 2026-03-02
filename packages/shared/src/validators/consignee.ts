import { z } from "zod";

export const createConsigneeSchema = z.object({
  agency_id: z.string().uuid(),
  full_name: z.string().min(1, "Nombre requerido"),
  casillero: z.string().regex(/^[A-Z0-9]{2,5}\d{6}$/, "Formato de casillero inválido").optional(),
  cedula_ruc: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
});

export type CreateConsigneeInput = z.infer<typeof createConsigneeSchema>;

export const updateConsigneeSchema = z.object({
  full_name: z.string().min(1, "Nombre requerido").optional(),
  casillero: z.string().regex(/^[A-Z0-9]{2,5}\d{6}$/, "Formato de casillero inválido").optional(),
  cedula_ruc: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateConsigneeInput = z.infer<typeof updateConsigneeSchema>;
