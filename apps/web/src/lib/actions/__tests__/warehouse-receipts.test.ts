import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

function createMockChain(resultFn: () => any) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "or", "order", "limit", "range",
    "single", "maybeSingle", "match", "filter", "head",
    "ilike", "like", "is", "not",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      if (m === "single" || m === "maybeSingle" || m === "head") {
        return Promise.resolve(resultFn());
      }
      return chain;
    });
  }
  chain.then = (resolve: any) => Promise.resolve(resultFn()).then(resolve);
  return chain;
}

let mockResult: any = { data: null, error: null };
const mockChain = createMockChain(() => mockResult);

const mockSupabase: any = {
  from: vi.fn(() => mockChain),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1", email: "test@test.com" } },
      error: null,
    }),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

import {
  checkDuplicateTracking,
  generateWrNumber,
  updateWarehouseReceiptStatus,
} from "../warehouse-receipts";

describe("checkDuplicateTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
  });

  it("returns null when no duplicate", async () => {
    const result = await checkDuplicateTracking("1Z999AA1012345");
    expect(result).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("warehouse_receipts");
  });

  it("returns existing WR data when duplicate found", async () => {
    const existing = { id: "wr-1", wr_number: "GLP0001", received_at: "2026-03-01" };
    mockResult = { data: existing, error: null };

    const result = await checkDuplicateTracking("1Z999AA1012345");
    expect(result).toEqual(existing);
  });
});

describe("generateWrNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
  });

  it("returns GLP0001 when no existing WRs", async () => {
    const result = await generateWrNumber();
    expect(result).toBe("GLP0001");
  });

  it("increments from last WR number", async () => {
    mockResult = { data: { wr_number: "GLP0042" }, error: null };

    const result = await generateWrNumber();
    expect(result).toBe("GLP0043");
  });
});

describe("updateWarehouseReceiptStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
  });

  it("throws when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    await expect(
      updateWarehouseReceiptStatus("wr-1", "in_warehouse"),
    ).rejects.toThrow("No autenticado");
  });

  it("throws when WR not found", async () => {
    mockResult = { data: null, error: null };

    await expect(
      updateWarehouseReceiptStatus("wr-1", "in_warehouse"),
    ).rejects.toThrow("WR no encontrado");
  });

  it("updates status and logs history on success", async () => {
    // First call (getUser) returns user, second call (get current) returns WR
    mockResult = { data: { status: "received", organization_id: "org-1" }, error: null };

    await updateWarehouseReceiptStatus("wr-1", "in_warehouse", "Ready for storage");

    // Should update warehouse_receipts and insert wr_status_history
    expect(mockSupabase.from).toHaveBeenCalledWith("warehouse_receipts");
    expect(mockSupabase.from).toHaveBeenCalledWith("wr_status_history");
  });
});
