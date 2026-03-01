import { z } from "zod";

export const createWorkOrderSchema = z.object({
  warehouse_id: z.string().uuid(),
  agency_id: z.string().uuid(),
  type: z.enum([
    "abandon", "group", "authorize_pickup", "consolidate", "delivery",
    "divide", "ship", "photos", "inspection", "inventory_count",
    "repack", "return", "special_request",
  ]),
  warehouse_receipt_ids: z.array(z.string().uuid()).min(1, "Seleccione al menos un WR"),
  instructions: z.string().optional(),
  // Pickup-specific fields
  pickup_date: z.string().optional(),
  pickup_time: z.string().optional(),
  pickup_location: z.string().optional(),
  pickup_authorized_person: z.string().optional(),
  pickup_contact_info: z.string().optional(),
}).superRefine((data, ctx) => {
  const minWrs: Record<string, number> = { group: 2, consolidate: 2, divide: 1 };
  const min = minWrs[data.type];
  if (min && data.warehouse_receipt_ids.length < min) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: min,
      type: "array",
      inclusive: true,
      path: ["warehouse_receipt_ids"],
      message: `Este tipo de OT requiere al menos ${min} WR(s)`,
    });
  }

  if (data.type === "authorize_pickup") {
    if (!data.pickup_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pickup_date"], message: "Fecha de retiro requerida" });
    }
    if (!data.pickup_location) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pickup_location"], message: "Ubicación requerida" });
    }
    if (!data.pickup_authorized_person) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pickup_authorized_person"], message: "Persona autorizada requerida" });
    }
  }

  if (data.type === "photos" && !data.instructions) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["instructions"], message: "Instrucciones de fotos requeridas" });
  }
});

export const completeWorkOrderSchema = z.object({
  result_notes: z.string().min(1, "Notas de resultado requeridas"),
  has_attachments: z.boolean().refine((v) => v === true, "Se requiere al menos 1 foto/reporte adjunto"),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type CompleteWorkOrderInput = z.infer<typeof completeWorkOrderSchema>;
