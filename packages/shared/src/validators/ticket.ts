import { z } from "zod";

export const createTicketSchema = z.object({
  agency_id: z.string().uuid(),
  category: z.string().min(1, "Categoría requerida"),
  subject: z.string().min(1, "Asunto requerido").max(255),
  description: z.string().min(1, "Descripción requerida"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  warehouse_receipt_ids: z.array(z.string().uuid()).optional(),
});

export const addTicketMessageSchema = z.object({
  ticket_id: z.string().uuid(),
  content: z.string().min(1, "Mensaje requerido"),
});

export const TICKET_VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["in_review", "closed"],
  in_review: ["resolved", "closed"],
  resolved: ["closed"],
};

export const updateTicketStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_review", "resolved", "closed"]),
  reason: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type AddTicketMessageInput = z.infer<typeof addTicketMessageSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
