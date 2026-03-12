import { z } from "zod";

// ── Carrier ──

export const createCarrierSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  code: z.string().min(1, "Código requerido"),
  modality: z.enum(["air", "ocean", "ground"]),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
});

export type CreateCarrierInput = z.infer<typeof createCarrierSchema>;

// ── AWB Batch ──

export const createAwbBatchSchema = z.object({
  carrier_id: z.string().uuid(),
  prefix: z.string().min(1, "Prefijo requerido"),
  range_start: z.coerce.number().int().min(0, "Inicio de rango requerido"),
  range_end: z.coerce.number().int().min(1, "Fin de rango requerido"),
  notes: z.string().optional(),
}).refine((d) => d.range_start < d.range_end, {
  message: "El inicio del rango debe ser menor que el fin",
  path: ["range_end"],
});

export type CreateAwbBatchInput = z.infer<typeof createAwbBatchSchema>;

// ── Container ──

export const createContainerSchema = z.object({
  shipment_id: z.string().uuid(),
  container_number: z.string().min(1, "Número de contenedor requerido"),
  seal_number: z.string().optional(),
  container_type: z.enum(["20ft", "40ft", "40hq", "45ft", "reefer_20", "reefer_40"]),
  tare_weight: z.coerce.number().optional(),
  max_payload: z.coerce.number().optional(),
});

export type CreateContainerInput = z.infer<typeof createContainerSchema>;

// ── Shipment (discriminated union by modality) ──

const shipmentBaseSchema = z.object({
  warehouse_id: z.string().uuid(),
  destination_id: z.string().uuid().optional(),
  destination_agent_id: z.string().uuid().optional(),
  carrier_id: z.string().uuid().optional(),
  shipper_name: z.string().optional(),
  shipper_address: z.string().optional(),
  consignee_name: z.string().optional(),
  consignee_address: z.string().optional(),
  notes: z.string().optional(),
});

export const createAirShipmentSchema = shipmentBaseSchema.extend({
  modality: z.literal("air"),
  awb_number: z.string().optional(),
  booking_number: z.string().optional(),
  flight_number: z.string().optional(),
  departure_airport: z.string().optional(),
  arrival_airport: z.string().optional(),
  departure_date: z.string().optional(),
  arrival_date: z.string().optional(),
});

export const createOceanShipmentSchema = shipmentBaseSchema.extend({
  modality: z.literal("ocean"),
  bol_number: z.string().optional(),
  port_of_loading: z.string().optional(),
  terminal_or_pier: z.string().optional(),
  pre_carrier: z.string().optional(),
  exporting_carrier: z.string().optional(),
  vessel_name: z.string().optional(),
  vessel_flag: z.string().optional(),
  voyage_id: z.string().optional(),
  port_of_unloading: z.string().optional(),
  place_of_delivery_by_on_carrier: z.string().optional(),
  freight_terms: z.enum(["prepaid", "collect"]).optional(),
  number_of_original_bols: z.coerce.number().int().optional(),
});

export const createGroundShipmentSchema = shipmentBaseSchema.extend({
  modality: z.literal("ground"),
  route_number: z.string().optional(),
  origin_terminal: z.string().optional(),
  destination_terminal: z.string().optional(),
  truck_plate: z.string().optional(),
  driver_name: z.string().optional(),
  driver_id_number: z.string().optional(),
  driver_phone: z.string().optional(),
  trailer_number: z.string().optional(),
  estimated_transit_hours: z.coerce.number().int().optional(),
  border_crossing_point: z.string().optional(),
});

export const createShipmentSchema = z.discriminatedUnion("modality", [
  createAirShipmentSchema,
  createOceanShipmentSchema,
  createGroundShipmentSchema,
]);

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type CreateAirShipmentInput = z.infer<typeof createAirShipmentSchema>;
export type CreateOceanShipmentInput = z.infer<typeof createOceanShipmentSchema>;
export type CreateGroundShipmentInput = z.infer<typeof createGroundShipmentSchema>;
