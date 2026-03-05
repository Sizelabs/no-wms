import { z } from "zod";

export const createMawbSchema = z.object({
  warehouse_id: z.string().uuid(),
  mawb_number: z.string().min(1, "Número MAWB requerido"),
  airline: z.string().min(1, "Aerolínea requerida"),
  flight_number: z.string().optional(),
  flight_date: z.string().optional(),
  destination_id: z.string().uuid(),
});

export const createAirlineReservationSchema = z.object({
  airline: z.string().min(1, "Aerolínea requerida"),
  reserved_mawb_numbers: z.array(z.string()).min(1, "Al menos un número reservado"),
  week_start: z.string(),
  week_end: z.string(),
  notes: z.string().optional(),
});

export const createPickupRequestSchema = z.object({
  agency_id: z.string().uuid(),
  warehouse_receipt_ids: z.array(z.string().uuid()).min(1, "Seleccione al menos un WR"),
  pickup_date: z.string().min(1, "Fecha requerida"),
  pickup_time: z.string().optional(),
  pickup_location: z.string().min(1, "Ubicación requerida"),
  authorized_person_name: z.string().min(1, "Persona autorizada requerida"),
  authorized_person_id: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const createTransferRequestSchema = z.object({
  warehouse_receipt_id: z.string().uuid(),
  from_agency_id: z.string().uuid(),
  to_agency_id: z.string().uuid(),
});

export type CreateMawbInput = z.infer<typeof createMawbSchema>;
export type CreateAirlineReservationInput = z.infer<typeof createAirlineReservationSchema>;
export type CreatePickupRequestInput = z.infer<typeof createPickupRequestSchema>;
export type CreateTransferRequestInput = z.infer<typeof createTransferRequestSchema>;
