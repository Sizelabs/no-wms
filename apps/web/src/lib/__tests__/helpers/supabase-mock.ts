import { vi } from "vitest";

type MockResult = { data: unknown; error: unknown; count?: number };

/**
 * Creates a chainable mock Supabase query builder.
 * Usage:
 *   const { supabase, mockResult } = createMockSupabase();
 *   mockResult({ data: [...], error: null });
 *   const result = await supabase.from("table").select("*");
 */
export function createMockQueryBuilder(resolvedValue: () => MockResult) {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte",
    "like", "ilike", "is", "in", "or", "not",
    "order", "limit", "range", "single", "maybeSingle",
    "match", "filter", "contains", "containedBy",
    "textSearch", "head",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockImplementation(() => {
      // For terminal methods, return the resolved value as a promise
      if (method === "single" || method === "maybeSingle" || method === "head") {
        return Promise.resolve(resolvedValue());
      }
      // For chaining methods, return the builder
      return builder;
    });
  }

  // Make the builder itself thenable (for queries without terminal method)
  builder.then = (resolve: (value: MockResult) => void) => {
    return Promise.resolve(resolvedValue()).then(resolve);
  };

  return builder;
}

export function createMockSupabase() {
  let currentResult: MockResult = { data: null, error: null };

  const queryBuilder = createMockQueryBuilder(() => currentResult);

  const supabase = {
    from: vi.fn().mockReturnValue(queryBuilder),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: "test-user-id", email: "test@example.com" },
        },
        error: null,
      }),
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({
          data: { user: { id: "new-user-id" } },
          error: null,
        }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  };

  function mockResult(result: MockResult) {
    currentResult = result;
  }

  function mockUser(user: { id: string; email: string } | null) {
    supabase.auth.getUser.mockResolvedValue({
      data: { user },
      error: user ? null : { message: "No user" },
    });
  }

  return { supabase, queryBuilder, mockResult, mockUser };
}
