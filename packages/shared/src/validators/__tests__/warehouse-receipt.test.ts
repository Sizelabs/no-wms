import { describe, expect, it } from "vitest";

import {
  calculateBillableWeight,
  calculateVolumetricWeight,
  createConsigneeSchema,
  createPackageSchema,
  createWarehouseReceiptSchema,
} from "../warehouse-receipt";

const validPackage = {
  tracking_number: "1Z999AA10123456784",
  carrier: "UPS",
};

const validWR = {
  warehouse_id: "a0000000-0000-0000-0000-000000000001",
  agency_id: "a0000000-0000-0000-0000-000000000002",
  packages: [validPackage],
};

describe("createPackageSchema", () => {
  it("accepts valid minimal input", () => {
    const result = createPackageSchema.safeParse(validPackage);
    expect(result.success).toBe(true);
  });

  it("accepts full input with dimensions", () => {
    const result = createPackageSchema.safeParse({
      ...validPackage,
      actual_weight_lb: 5.5,
      length_in: 12,
      width_in: 8,
      height_in: 6,
      content_description: "Electronics",
      sender_name: "Amazon",
      pieces_count: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing tracking_number", () => {
    const result = createPackageSchema.safeParse({
      ...validPackage,
      tracking_number: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing carrier", () => {
    const result = createPackageSchema.safeParse({
      ...validPackage,
      carrier: "",
    });
    expect(result.success).toBe(false);
  });

  it("requires damage_description when is_damaged is true", () => {
    const result = createPackageSchema.safeParse({
      ...validPackage,
      is_damaged: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toContain("damage_description");
    }
  });

  it("accepts damage_description when is_damaged is true", () => {
    const result = createPackageSchema.safeParse({
      ...validPackage,
      is_damaged: true,
      damage_description: "Box crushed",
    });
    expect(result.success).toBe(true);
  });

  it("defaults is_dgr to false", () => {
    const result = createPackageSchema.safeParse(validPackage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_dgr).toBe(false);
    }
  });

  it("defaults pieces_count to 1", () => {
    const result = createPackageSchema.safeParse(validPackage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pieces_count).toBe(1);
    }
  });

  it("rejects negative weight", () => {
    const result = createPackageSchema.safeParse({
      ...validPackage,
      actual_weight_lb: -5,
    });
    expect(result.success).toBe(false);
  });
});

describe("createWarehouseReceiptSchema", () => {
  it("accepts valid minimal input", () => {
    const result = createWarehouseReceiptSchema.safeParse(validWR);
    expect(result.success).toBe(true);
  });

  it("requires at least one package", () => {
    const result = createWarehouseReceiptSchema.safeParse({
      ...validWR,
      packages: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts multiple packages", () => {
    const result = createWarehouseReceiptSchema.safeParse({
      ...validWR,
      packages: [
        { tracking_number: "TRK001", carrier: "UPS" },
        { tracking_number: "TRK002", carrier: "FedEx" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.packages).toHaveLength(2);
    }
  });

  it("rejects non-uuid warehouse_id", () => {
    const result = createWarehouseReceiptSchema.safeParse({
      ...validWR,
      warehouse_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("createConsigneeSchema", () => {
  it("accepts valid input", () => {
    const result = createConsigneeSchema.safeParse({
      agency_id: "a0000000-0000-0000-0000-000000000001",
      full_name: "María García",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing full_name", () => {
    const result = createConsigneeSchema.safeParse({
      agency_id: "a0000000-0000-0000-0000-000000000001",
      full_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional email when valid", () => {
    const result = createConsigneeSchema.safeParse({
      agency_id: "a0000000-0000-0000-0000-000000000001",
      full_name: "Test",
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createConsigneeSchema.safeParse({
      agency_id: "a0000000-0000-0000-0000-000000000001",
      full_name: "Test",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string email", () => {
    const result = createConsigneeSchema.safeParse({
      agency_id: "a0000000-0000-0000-0000-000000000001",
      full_name: "Test",
      email: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("calculateVolumetricWeight", () => {
  it("calculates correctly with standard factor 166", () => {
    // 20 × 15 × 10 = 3000 / 166 ≈ 18.07
    const result = calculateVolumetricWeight(20, 15, 10, 166);
    expect(result).toBeCloseTo(18.07, 1);
  });

  it("calculates correctly with factor 139", () => {
    // 20 × 15 × 10 = 3000 / 139 ≈ 21.58
    const result = calculateVolumetricWeight(20, 15, 10, 139);
    expect(result).toBeCloseTo(21.58, 1);
  });

  it("returns 0 when any dimension is 0", () => {
    expect(calculateVolumetricWeight(0, 15, 10, 166)).toBe(0);
  });
});

describe("calculateBillableWeight", () => {
  it("returns actual when actual > volumetric", () => {
    expect(calculateBillableWeight(25, 18)).toBe(25);
  });

  it("returns volumetric when volumetric > actual", () => {
    expect(calculateBillableWeight(10, 18)).toBe(18);
  });

  it("handles null actual weight", () => {
    expect(calculateBillableWeight(null, 18)).toBe(18);
  });

  it("handles null volumetric weight", () => {
    expect(calculateBillableWeight(25, null)).toBe(25);
  });

  it("handles both null", () => {
    expect(calculateBillableWeight(null, null)).toBe(0);
  });

  it("handles undefined values", () => {
    expect(calculateBillableWeight(undefined, undefined)).toBe(0);
  });
});
