import { z } from "zod";

const zoneTypeValues = [
  "receiving", "putaway", "storage", "work_order",
  "staging", "quarantine", "damaged",
] as const;

const movementTypeValues = [
  "receive", "putaway", "pick", "relocate", "stage",
  "dispatch", "quarantine", "damage", "return_to_storage",
] as const;

// ── Zone schemas ──

export const createZoneSchema = z.object({
  warehouse_id: z.string().uuid(),
  name: z.string().min(1, "Nombre requerido").max(100),
  code: z.string().min(1, "Código requerido").max(10).regex(/^[A-Z0-9_]+$/, "Solo letras mayúsculas, números y guiones bajos"),
  zone_type: z.enum(zoneTypeValues),
  sort_order: z.coerce.number().int().nonnegative().optional(),
});
export type CreateZoneInput = z.infer<typeof createZoneSchema>;

export const updateZoneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(10).regex(/^[A-Z0-9_]+$/).optional(),
  zone_type: z.enum(zoneTypeValues).optional(),
  sort_order: z.coerce.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

// ── Location schemas ──

export const createLocationSchema = z.object({
  zone_id: z.string().uuid(),
  name: z.string().min(1, "Nombre requerido").max(100),
  code: z.string().min(1, "Código requerido").max(20).regex(/^[A-Z0-9\-]+$/, "Solo letras mayúsculas, números y guiones"),
  max_packages: z.coerce.number().int().positive().nullish(),
  max_weight_lb: z.coerce.number().positive().nullish(),
  max_length_in: z.coerce.number().positive().nullish(),
  max_width_in: z.coerce.number().positive().nullish(),
  max_height_in: z.coerce.number().positive().nullish(),
  preferred_agency_id: z.string().uuid().nullish(),
});
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).regex(/^[A-Z0-9\-]+$/).optional(),
  is_active: z.boolean().optional(),
  is_blocked: z.boolean().optional(),
  blocked_reason: z.string().max(200).nullish(),
  max_packages: z.coerce.number().int().positive().nullish(),
  max_weight_lb: z.coerce.number().positive().nullish(),
  max_length_in: z.coerce.number().positive().nullish(),
  max_width_in: z.coerce.number().positive().nullish(),
  max_height_in: z.coerce.number().positive().nullish(),
  preferred_agency_id: z.string().uuid().nullish(),
});
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ── Bulk generation (storage zones) ──

export const bulkCreateStorageLocationsSchema = z.object({
  zone_id: z.string().uuid(),
  aisles: z.string().min(1, "Al menos un pasillo").regex(/^[A-Z](,[A-Z])*$/, "Letras A-Z separadas por coma"),
  racks_per_aisle: z.coerce.number().int().min(1).max(99),
  shelves_per_rack: z.coerce.number().int().min(1).max(20),
  positions_per_shelf: z.coerce.number().int().min(1).max(20),
});
export type BulkCreateStorageLocationsInput = z.infer<typeof bulkCreateStorageLocationsSchema>;

// ── Movement schemas ──

export const recordMovementSchema = z.object({
  package_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  from_location_id: z.string().uuid().nullish(),
  to_location_id: z.string().uuid(),
  movement_type: z.enum(movementTypeValues),
  suggested_location_id: z.string().uuid().nullish(),
  notes: z.string().max(500).nullish(),
});
export type RecordMovementInput = z.infer<typeof recordMovementSchema>;

// ── Block/unblock ──

export const toggleBlockedSchema = z.object({
  is_blocked: z.boolean(),
  blocked_reason: z.string().max(200).nullish(),
});
export type ToggleBlockedInput = z.infer<typeof toggleBlockedSchema>;
