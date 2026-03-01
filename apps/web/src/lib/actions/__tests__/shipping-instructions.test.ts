import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

function createMockChain(resultFn: () => any) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "or", "order", "limit", "range",
    "single", "maybeSingle", "match", "filter", "head",
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
      data: { user: { id: "user-1" } },
      error: null,
    }),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

import {
  approveShippingInstruction,
  createShippingInstruction,
  finalizeShippingInstruction,
} from "../shipping-instructions";

describe("createShippingInstruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const fd = new FormData();
    fd.set("warehouse_receipt_ids", '["wr-1"]');

    const result = await createShippingInstruction(fd);
    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error for empty WR list", async () => {
    const fd = new FormData();
    fd.set("warehouse_receipt_ids", "[]");

    const result = await createShippingInstruction(fd);
    expect(result).toEqual({ error: "Seleccione al menos un WR" });
  });

  it("blocks WRs with active work orders", async () => {
    mockResult = { data: [{ warehouse_receipt_id: "wr-1" }], error: null };

    const fd = new FormData();
    fd.set("warehouse_receipt_ids", '["wr-1"]');

    const result = await createShippingInstruction(fd);
    expect(result).toEqual({
      error: "Uno o más WRs tienen órdenes de trabajo activas. Cancele las OT primero.",
    });
  });

  it("creates shipping instruction on happy path", async () => {
    // Mock returns object (not array), so activeWoItems?.length is undefined (passes check)
    mockResult = { data: { id: "si-1", organization_id: "org-1" }, error: null, count: 3 };

    const fd = new FormData();
    fd.set("warehouse_id", "wh-1");
    fd.set("agency_id", "ag-1");
    fd.set("destination_country_id", "dc-1");
    fd.set("modality", "courier_a");
    fd.set("consignee_id", "con-1");
    fd.set("warehouse_receipt_ids", '["wr-1"]');

    const result = await createShippingInstruction(fd);
    // Should have called from for multiple tables
    expect(mockSupabase.from).toHaveBeenCalledWith("shipping_instructions");
  });
});

describe("approveShippingInstruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await approveShippingInstruction("si-1");
    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error when SI not found", async () => {
    mockResult = { data: null, error: null };

    const result = await approveShippingInstruction("si-1");
    expect(result).toEqual({ error: "SI no encontrada" });
  });

  it("returns error when SI is not in requested status", async () => {
    mockResult = { data: { status: "approved", organization_id: "org-1" }, error: null };

    const result = await approveShippingInstruction("si-1");
    expect(result).toEqual({ error: "Solo se pueden aprobar SIs en estado 'Solicitada'" });
  });

  it("approves SI successfully", async () => {
    mockResult = { data: { status: "requested", organization_id: "org-1" }, error: null };

    const result = await approveShippingInstruction("si-1");
    expect(result).toEqual({});
    expect(mockSupabase.from).toHaveBeenCalledWith("shipping_instructions");
    expect(mockSupabase.from).toHaveBeenCalledWith("shipping_instruction_status_history");
  });
});

describe("finalizeShippingInstruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await finalizeShippingInstruction("si-1");
    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error when SI not found", async () => {
    mockResult = { data: null, error: null };

    const result = await finalizeShippingInstruction("si-1");
    expect(result).toEqual({ error: "SI no encontrada" });
  });

  it("returns error when SI is not approved", async () => {
    mockResult = { data: { status: "requested", organization_id: "org-1" }, error: null };

    const result = await finalizeShippingInstruction("si-1");
    expect(result).toEqual({ error: "Solo se pueden finalizar SIs aprobadas" });
  });

  it("finalizes SI, creates HAWB, and returns hawb_number", async () => {
    mockResult = {
      data: {
        status: "approved",
        organization_id: "org-1",
        shipping_instruction_items: [
          { warehouse_receipt_id: "wr-1", warehouse_receipts: { actual_weight_lb: 10, billable_weight_lb: 12 } },
          { warehouse_receipt_id: "wr-2", warehouse_receipts: { actual_weight_lb: 8, billable_weight_lb: 8 } },
        ],
      },
      error: null,
      count: 0,
    };

    const result = await finalizeShippingInstruction("si-1");
    // Should have created HAWB and updated SI
    expect(mockSupabase.from).toHaveBeenCalledWith("hawbs");
    expect(mockSupabase.from).toHaveBeenCalledWith("shipping_instructions");
    expect(mockSupabase.from).toHaveBeenCalledWith("shipping_instruction_status_history");
    // hawb_number should be GLP00001 (count=0, so 0+1=1)
    expect(result.hawb_number).toBe("GLP00001");
  });
});
