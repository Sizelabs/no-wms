import { z } from "zod";

// Per-type metadata schemas
export const abandonMetadataSchema = z.object({
  confirmation_text: z.string(),
});

export const groupMetadataSchema = z.object({
  auto_ship: z.boolean().default(false),
});

export const consolidateMetadataSchema = z.object({});

export const shipMetadataSchema = z.object({
  destination_address: z.string().min(1, "Direccion requerida"),
  destination_city: z.string().min(1, "Ciudad requerida"),
  destination_country: z.string().min(1, "Pais requerido"),
  recipient_name: z.string().min(1, "Nombre del destinatario requerido"),
  recipient_phone: z.string().optional(),
});

export const divideMetadataSchema = z.object({
  split_count: z.number().int().min(2).max(50),
  split_instructions: z.string().optional(),
});

export const photosMetadataSchema = z.object({
  photo_type: z.enum(["general", "contents", "labels", "damage"]),
  angle_instructions: z.string().optional(),
});

export const inspectionMetadataSchema = z.object({
  inspection_focus: z.string().optional(),
  check_for_dgr: z.boolean(),
});

export const inventoryMetadataSchema = z.object({
  detail_level: z.enum(["simple", "detailed"]),
});

export const repackMetadataSchema = z.object({});

export const returnMetadataSchema = z.object({
  return_label_path: z.string().optional(),
});

export const specialRequestMetadataSchema = z.object({});

export const WO_METADATA_SCHEMAS: Record<string, z.ZodType> = {
  abandon: abandonMetadataSchema,
  group: groupMetadataSchema,
  consolidate: consolidateMetadataSchema,
  ship: shipMetadataSchema,
  divide: divideMetadataSchema,
  photos: photosMetadataSchema,
  inspection: inspectionMetadataSchema,
  inventory_count: inventoryMetadataSchema,
  repack: repackMetadataSchema,
  return: returnMetadataSchema,
  special_request: specialRequestMetadataSchema,
};

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
  metadata: z.record(z.unknown()).optional(),
  // Pickup-specific fields
  pickup_date: z.string().optional(),
  pickup_time: z.string().optional(),
  pickup_location: z.string().optional(),
  pickup_authorized_person: z.string().optional(),
  pickup_contact_info: z.string().optional(),
}).superRefine((data, ctx) => {
  const minWrs: Record<string, number> = { group: 2, consolidate: 2, divide: 1 };
  const maxWrs: Record<string, number> = { divide: 1 };
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
  const max = maxWrs[data.type];
  if (max && data.warehouse_receipt_ids.length > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_big,
      maximum: max,
      type: "array",
      inclusive: true,
      path: ["warehouse_receipt_ids"],
      message: `Este tipo de OT permite maximo ${max} WR(s)`,
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

  // Validate metadata against type-specific schema
  if (data.metadata) {
    const metaSchema = WO_METADATA_SCHEMAS[data.type];
    if (metaSchema) {
      const result = metaSchema.safeParse(data.metadata);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metadata", ...issue.path],
            message: issue.message,
          });
        }
      }
    }
  }
});

export const completeWorkOrderSchema = z.object({
  result_notes: z.string().min(1, "Notas de resultado requeridas"),
  has_attachments: z.boolean().refine((v) => v === true, "Se requiere al menos 1 foto/reporte adjunto"),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type CompleteWorkOrderInput = z.infer<typeof completeWorkOrderSchema>;
