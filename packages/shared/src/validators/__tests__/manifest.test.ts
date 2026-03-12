import { describe, expect, it } from "vitest";

import {
  createPickupRequestSchema,
  createTransferRequestSchema,
} from "../manifest";
import { createShipmentSchema } from "../shipment";

describe("createShipmentSchema", () => {
  it("accepts valid air shipment", () => {
    const result = createShipmentSchema.safeParse({
      modality: "air",
      warehouse_id: "a0000000-0000-0000-0000-000000000001",
      flight_number: "LA-601",
      departure_date: "2026-03-15",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid ocean shipment", () => {
    const result = createShipmentSchema.safeParse({
      modality: "ocean",
      warehouse_id: "a0000000-0000-0000-0000-000000000001",
      vessel_name: "MSC Fantasia",
      port_of_loading: "Guayaquil",
      freight_terms: "prepaid",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid ground shipment", () => {
    const result = createShipmentSchema.safeParse({
      modality: "ground",
      warehouse_id: "a0000000-0000-0000-0000-000000000001",
      truck_plate: "ABC-1234",
      driver_name: "Juan Pérez",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid modality", () => {
    const result = createShipmentSchema.safeParse({
      modality: "rail",
      warehouse_id: "a0000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing warehouse_id", () => {
    const result = createShipmentSchema.safeParse({
      modality: "air",
    });
    expect(result.success).toBe(false);
  });
});

describe("createPickupRequestSchema", () => {
  const validPickup = {
    agency_id: "a0000000-0000-0000-0000-000000000002",
    warehouse_receipt_ids: ["a0000000-0000-0000-0000-000000000010"],
    pickup_date: "2026-03-15",
    pickup_location: "Warehouse A - Dock 3",
    authorized_person_name: "Juan Pérez",
  };

  it("accepts valid pickup request", () => {
    const result = createPickupRequestSchema.safeParse(validPickup);
    expect(result.success).toBe(true);
  });

  it("rejects missing pickup_date", () => {
    const result = createPickupRequestSchema.safeParse({
      ...validPickup,
      pickup_date: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing pickup_location", () => {
    const result = createPickupRequestSchema.safeParse({
      ...validPickup,
      pickup_location: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing authorized_person_name", () => {
    const result = createPickupRequestSchema.safeParse({
      ...validPickup,
      authorized_person_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional contact fields", () => {
    const result = createPickupRequestSchema.safeParse({
      ...validPickup,
      pickup_time: "14:00",
      contact_phone: "+593999888777",
      contact_email: "juan@example.com",
      notes: "Please call before arrival",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string contact_email", () => {
    const result = createPickupRequestSchema.safeParse({
      ...validPickup,
      contact_email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid contact_email", () => {
    const result = createPickupRequestSchema.safeParse({
      ...validPickup,
      contact_email: "not-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("createTransferRequestSchema", () => {
  it("accepts valid transfer request", () => {
    const result = createTransferRequestSchema.safeParse({
      warehouse_receipt_id: "a0000000-0000-0000-0000-000000000010",
      from_agency_id: "a0000000-0000-0000-0000-000000000002",
      to_agency_id: "a0000000-0000-0000-0000-000000000003",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-uuid warehouse_receipt_id", () => {
    const result = createTransferRequestSchema.safeParse({
      warehouse_receipt_id: "not-a-uuid",
      from_agency_id: "a0000000-0000-0000-0000-000000000002",
      to_agency_id: "a0000000-0000-0000-0000-000000000003",
    });
    expect(result.success).toBe(false);
  });
});
