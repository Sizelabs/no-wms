import { describe, expect, it } from "vitest";

import { completeWorkOrderSchema, createWorkOrderSchema } from "../work-order";

const validWO = {
  warehouse_id: "a0000000-0000-0000-0000-000000000001",
  agency_id: "a0000000-0000-0000-0000-000000000002",
  type: "photos" as const,
  warehouse_receipt_ids: ["a0000000-0000-0000-0000-000000000010"],
  instructions: "Take front and back photos",
};

describe("createWorkOrderSchema", () => {
  it("accepts valid work order", () => {
    const result = createWorkOrderSchema.safeParse(validWO);
    expect(result.success).toBe(true);
  });

  it("rejects empty warehouse_receipt_ids", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWO,
      warehouse_receipt_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires min 2 WRs for group type", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWO,
      type: "group",
      warehouse_receipt_ids: ["a0000000-0000-0000-0000-000000000010"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts 2+ WRs for group type", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWO,
      type: "group",
      warehouse_receipt_ids: [
        "a0000000-0000-0000-0000-000000000010",
        "a0000000-0000-0000-0000-000000000011",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("requires min 2 WRs for consolidate type", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWO,
      type: "consolidate",
      warehouse_receipt_ids: ["a0000000-0000-0000-0000-000000000010"],
    });
    expect(result.success).toBe(false);
  });

  it("requires pickup fields for authorize_pickup", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWO,
      type: "authorize_pickup",
    });
    expect(result.success).toBe(false);
  });

  it("accepts authorize_pickup with required fields", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWO,
      type: "authorize_pickup",
      pickup_date: "2026-03-15",
      pickup_location: "Front desk",
      pickup_authorized_person: "John Doe",
    });
    expect(result.success).toBe(true);
  });

  it("requires instructions for photos type", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWO,
      type: "photos",
      instructions: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("accepts inspection type without special requirements", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWO,
      type: "inspection",
      instructions: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = createWorkOrderSchema.safeParse({
      ...validWO,
      type: "nonexistent_type",
    });
    expect(result.success).toBe(false);
  });
});

describe("completeWorkOrderSchema", () => {
  it("accepts valid completion", () => {
    const result = completeWorkOrderSchema.safeParse({
      result_notes: "All photos taken, uploaded 5 images",
      has_attachments: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty result_notes", () => {
    const result = completeWorkOrderSchema.safeParse({
      result_notes: "",
      has_attachments: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects has_attachments = false", () => {
    const result = completeWorkOrderSchema.safeParse({
      result_notes: "Done",
      has_attachments: false,
    });
    expect(result.success).toBe(false);
  });
});
