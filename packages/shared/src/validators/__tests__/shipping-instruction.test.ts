import { describe, expect, it } from "vitest";

import {
  additionalChargeSchema,
  createShippingInstructionSchema,
} from "../shipping-instruction";

const validSI = {
  warehouse_id: "a0000000-0000-0000-0000-000000000001",
  agency_id: "a0000000-0000-0000-0000-000000000002",
  destination_country_id: "a0000000-0000-0000-0000-000000000003",
  modality: "courier_a" as const,
  consignee_id: "a0000000-0000-0000-0000-000000000004",
  warehouse_receipt_ids: ["a0000000-0000-0000-0000-000000000010"],
};

describe("createShippingInstructionSchema", () => {
  it("accepts valid shipping instruction", () => {
    const result = createShippingInstructionSchema.safeParse(validSI);
    expect(result.success).toBe(true);
  });

  it("rejects empty warehouse_receipt_ids", () => {
    const result = createShippingInstructionSchema.safeParse({
      ...validSI,
      warehouse_receipt_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid cédula (10 digits)", () => {
    const result = createShippingInstructionSchema.safeParse({
      ...validSI,
      cedula_ruc: "0901234567",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid RUC (13 digits)", () => {
    const result = createShippingInstructionSchema.safeParse({
      ...validSI,
      cedula_ruc: "0901234567001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid cédula/RUC (wrong digit count)", () => {
    const result = createShippingInstructionSchema.safeParse({
      ...validSI,
      cedula_ruc: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric cédula/RUC", () => {
    const result = createShippingInstructionSchema.safeParse({
      ...validSI,
      cedula_ruc: "090123ABCD",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid modalities", () => {
    const modalities = [
      "courier_a", "courier_b", "courier_c", "courier_d",
      "courier_e", "courier_f", "courier_g", "air_cargo",
    ] as const;
    for (const modality of modalities) {
      const result = createShippingInstructionSchema.safeParse({
        ...validSI,
        modality,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid modality", () => {
    const result = createShippingInstructionSchema.safeParse({
      ...validSI,
      modality: "invalid_modality",
    });
    expect(result.success).toBe(false);
  });

  it("defaults cupo_4x4_used to false", () => {
    const result = createShippingInstructionSchema.safeParse(validSI);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cupo_4x4_used).toBe(false);
    }
  });
});

describe("additionalChargeSchema", () => {
  it("accepts valid charge", () => {
    const result = additionalChargeSchema.safeParse({
      description: "Handling fee",
      amount: 15.50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = additionalChargeSchema.safeParse({
      description: "",
      amount: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = additionalChargeSchema.safeParse({
      description: "Fee",
      amount: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = additionalChargeSchema.safeParse({
      description: "Fee",
      amount: 0,
    });
    expect(result.success).toBe(false);
  });
});
