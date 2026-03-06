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

// Per-table result overrides
let tableResults: Record<string, any> = {};

const mockSupabase: any = {
  from: vi.fn((table: string) => {
    if (tableResults[table]) {
      return createMockChain(() => tableResults[table]);
    }
    return mockChain;
  }),
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
    tableResults = {};
  });

  it("returns null when no duplicate", async () => {
    const result = await checkDuplicateTracking("1Z999AA1012345");
    expect(result).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("packages");
  });

  it("returns existing WR data when duplicate found", async () => {
    mockResult = {
      data: {
        id: "pkg-1",
        warehouse_receipt_id: "wr-1",
        warehouse_receipts: { wr_number: "MIA000001", received_at: "2026-03-01" },
      },
      error: null,
    };

    const result = await checkDuplicateTracking("1Z999AA1012345");
    expect(result).toEqual({ id: "wr-1", wr_number: "MIA000001", received_at: "2026-03-01" });
  });
});

describe("generateWrNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
    tableResults = {};
  });

  it("returns MIA000001 when no existing WRs for warehouse", async () => {
    tableResults["warehouses"] = { data: { code: "MIA" }, error: null };
    tableResults["warehouse_receipts"] = { data: null, error: null };

    const result = await generateWrNumber("warehouse-1");
    expect(result).toBe("MIA000001");
  });

  it("increments from last WR number with 6-digit padding", async () => {
    tableResults["warehouses"] = { data: { code: "MIA" }, error: null };
    tableResults["warehouse_receipts"] = { data: { wr_number: "MIA000042" }, error: null };

    const result = await generateWrNumber("warehouse-1");
    expect(result).toBe("MIA000043");
  });

  it("uses warehouse code as prefix", async () => {
    tableResults["warehouses"] = { data: { code: "LAX" }, error: null };
    tableResults["warehouse_receipts"] = { data: null, error: null };

    const result = await generateWrNumber("warehouse-2");
    expect(result).toBe("LAX000001");
  });

  it("throws when warehouse not found", async () => {
    tableResults["warehouses"] = { data: null, error: null };

    await expect(generateWrNumber("bad-id")).rejects.toThrow("Bodega no encontrada");
  });
});

describe("updateWarehouseReceiptStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
    tableResults = {};
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
