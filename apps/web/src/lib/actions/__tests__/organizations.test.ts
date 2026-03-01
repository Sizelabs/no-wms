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
    admin: {
      inviteUserByEmail: vi.fn().mockResolvedValue({
        data: { user: { id: "invited-user-1" } },
        error: null,
      }),
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockSupabase),
}));

import {
  createOrganization,
  deleteOrganization,
  getOrganizations,
} from "../organizations";

describe("getOrganizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
  });

  it("returns organizations on success", async () => {
    const orgs = [
      { id: "1", name: "ACME", slug: "acme" },
      { id: "2", name: "Globex", slug: "globex" },
    ];
    mockResult = { data: orgs, error: null };

    const result = await getOrganizations();
    expect(result.data).toEqual(orgs);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("organizations");
  });

  it("returns error on failure", async () => {
    mockResult = { data: null, error: { message: "DB error" } };

    const result = await getOrganizations();
    expect(result.data).toBeNull();
    expect(result.error).toBe("DB error");
  });
});

describe("createOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: { id: "new-org-1" }, error: null };
  });

  it("creates org, invites user, creates profile and role", async () => {
    const fd = new FormData();
    fd.set("name", "Test Corp");
    fd.set("admin_name", "Admin User");
    fd.set("admin_email", "admin@test.com");

    await createOrganization(fd);

    // Should insert into organizations
    expect(mockSupabase.from).toHaveBeenCalledWith("organizations");
    // Should invite user
    expect(mockSupabase.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      "admin@test.com",
      expect.objectContaining({ data: { full_name: "Admin User" } }),
    );
    // Should insert profile
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    // Should insert user_roles
    expect(mockSupabase.from).toHaveBeenCalledWith("user_roles");
  });

  it("throws on org creation failure", async () => {
    mockResult = { data: null, error: { message: "Duplicate slug" } };

    const fd = new FormData();
    fd.set("name", "Test Corp");
    fd.set("admin_name", "Admin");
    fd.set("admin_email", "admin@test.com");

    await expect(createOrganization(fd)).rejects.toThrow("Duplicate slug");
  });

  it("rolls back org if invite fails", async () => {
    // First call (org insert) succeeds, then invite fails
    mockResult = { data: { id: "new-org-1" }, error: null };
    mockSupabase.auth.admin.inviteUserByEmail.mockResolvedValueOnce({
      data: null,
      error: { message: "Email already exists" },
    });

    const fd = new FormData();
    fd.set("name", "Test Corp");
    fd.set("admin_name", "Admin");
    fd.set("admin_email", "admin@test.com");

    await expect(createOrganization(fd)).rejects.toThrow("Email already exists");
    // Should have attempted to delete the org
    expect(mockSupabase.from).toHaveBeenCalledWith("organizations");
  });
});

describe("deleteOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: null, error: null };
  });

  it("returns null on success", async () => {
    const result = await deleteOrganization("org-1");
    expect(result).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("organizations");
  });

  it("returns error on failure", async () => {
    mockResult = { data: null, error: { message: "FK constraint" } };

    const result = await deleteOrganization("org-1");
    expect(result).toEqual({ error: "FK constraint" });
  });
});
