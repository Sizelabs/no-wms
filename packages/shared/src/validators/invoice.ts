import { z } from "zod";

export const generateInvoiceSchema = z.object({
  agency_id: z.string().uuid("Agencia requerida"),
  period_start: z.string().min(1, "Fecha de inicio requerida"),
  period_end: z.string().min(1, "Fecha de fin requerida"),
}).refine(
  (data) => new Date(data.period_end) >= new Date(data.period_start),
  { message: "Fecha de fin debe ser igual o posterior a la de inicio", path: ["period_end"] },
);

const validTransitions: Record<string, string[]> = {
  draft: ["sent", "void"],
  sent: ["paid", "overdue", "void"],
};

export const updateInvoiceStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]),
}).refine(
  // Transition validity is checked in the server action with current status
  (data) => data.status !== undefined,
  { message: "Estado requerido" },
);

export const voidInvoiceSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Razón de anulación requerida"),
});

export const manualLineItemSchema = z.object({
  type: z.enum(["shipping", "storage", "work_order", "surcharge", "other"]),
  description: z.string().min(1, "Descripción requerida"),
  quantity: z.number().positive("Cantidad requerida"),
  unit_price: z.number().min(0, "Precio unitario requerido"),
});

export { validTransitions as INVOICE_VALID_TRANSITIONS };

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type ManualLineItemInput = z.infer<typeof manualLineItemSchema>;
