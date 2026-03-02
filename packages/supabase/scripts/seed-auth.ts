/**
 * seed-auth.ts — Create test users via Supabase GoTrue Admin API
 *
 * Raw SQL inserts into auth.users break GoTrue's internal schema.
 * This script uses the Admin API to create users properly.
 *
 * Runs automatically as part of `pnpm db:reset`.
 * Can also be run standalone: `pnpm seed:auth`
 *
 * Auto-detects local Supabase service_role key via `supabase status`.
 * Override with env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { execSync } from "node:child_process";

function getLocalServiceRoleKey(): string {
  try {
    const output = execSync("supabase status", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const match = output.match(/service_role key:\s+(\S+)/);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || getLocalServiceRoleKey();

const PASSWORD = "TestPassword1234";

interface SeedUser {
  id: string;
  email: string;
  full_name: string;
}

const users: SeedUser[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    email: "superadmin@test.nowms.dev",
    full_name: "Super Admin",
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    email: "companyadmin@test.nowms.dev",
    full_name: "Company Admin ACME",
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    email: "whadmin.mia@test.nowms.dev",
    full_name: "WH Admin Miami",
  },
  {
    id: "b0000000-0000-0000-0000-000000000004",
    email: "whadmin.gye@test.nowms.dev",
    full_name: "WH Admin Guayaquil",
  },
  {
    id: "b0000000-0000-0000-0000-000000000005",
    email: "operator.mia@test.nowms.dev",
    full_name: "Operator Miami",
  },
  {
    id: "b0000000-0000-0000-0000-000000000006",
    email: "operator.gye@test.nowms.dev",
    full_name: "Operator Guayaquil",
  },
  {
    id: "b0000000-0000-0000-0000-000000000007",
    email: "shipping@test.nowms.dev",
    full_name: "Shipping Clerk Miami",
  },
  {
    id: "b0000000-0000-0000-0000-000000000008",
    email: "destadmin.ec@test.nowms.dev",
    full_name: "Dest Admin Ecuador",
  },
  {
    id: "b0000000-0000-0000-0000-000000000009",
    email: "destadmin.co@test.nowms.dev",
    full_name: "Dest Admin Colombia",
  },
  {
    id: "b0000000-0000-0000-0000-00000000000a",
    email: "agency.rapidito@test.nowms.dev",
    full_name: "Agency Rapidito",
  },
  {
    id: "b0000000-0000-0000-0000-00000000000b",
    email: "agency.box4you@test.nowms.dev",
    full_name: "Agency Box4You",
  },
  {
    id: "b0000000-0000-0000-0000-00000000000c",
    email: "globex.admin@test.nowms.dev",
    full_name: "Globex Admin",
  },
  {
    id: "b0000000-0000-0000-0000-00000000000d",
    email: "globex.operator@test.nowms.dev",
    full_name: "Globex Operator LAX",
  },
  {
    id: "b0000000-0000-0000-0000-00000000000e",
    email: "pinnacle.admin@test.nowms.dev",
    full_name: "Pinnacle Admin",
  },
  {
    id: "b0000000-0000-0000-0000-00000000000f",
    email: "pinnacle.agency@test.nowms.dev",
    full_name: "Pinnacle Agency Costa",
  },
];

async function createUser(user: SeedUser): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    }),
  });

  if (res.ok) {
    console.log(`  ✓ ${user.email}`);
    return;
  }

  const body = await res.json().catch(() => ({}));

  // User already exists — that's fine
  if (
    res.status === 422 &&
    typeof body.msg === "string" &&
    body.msg.includes("already been registered")
  ) {
    console.log(`  ~ ${user.email} (already exists)`);
    return;
  }

  console.error(`  ✗ ${user.email} — ${res.status}: ${JSON.stringify(body)}`);
  process.exitCode = 1;
}

async function clearOrphanedRows(): Promise<void> {
  // The seed.sql inserts profiles/user_roles with FK checks disabled
  // (session_replication_role = 'replica'). When running against a remote DB,
  // GoTrue fails to create auth.users if profiles already reference those IDs.
  // We delete orphaned rows here so GoTrue can insert cleanly, then re-seed
  // profiles/user_roles via the seed.sql ON CONFLICT DO NOTHING clauses.
  const userIds = users.map((u) => `"${u.id}"`).join(",");

  for (const table of ["notification_preferences", "user_roles", "profiles"]) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?id=in.(${encodeURIComponent(userIds.replace(/"/g, ""))})`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          Prefer: "return=minimal",
        },
      },
    );
    if (!res.ok && res.status !== 404) {
      // user_roles uses user_id, not id
      if (table === "user_roles") {
        const res2 = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?user_id=in.(${encodeURIComponent(userIds.replace(/"/g, ""))})`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              apikey: SERVICE_ROLE_KEY,
              Prefer: "return=minimal",
            },
          },
        );
        if (res2.ok) continue;
      }
      if (table === "notification_preferences") {
        const res2 = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?user_id=in.(${encodeURIComponent(userIds.replace(/"/g, ""))})`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              apikey: SERVICE_ROLE_KEY,
              Prefer: "return=minimal",
            },
          },
        );
        if (res2.ok) continue;
      }
    }
  }
}

async function reseedProfilesAndRoles(): Promise<void> {
  // After auth users exist, re-insert profiles and user_roles from seed data.
  // We use the REST API with upsert (Prefer: resolution=merge-duplicates).
  const profileRows = users.map((u) => ({
    id: u.id,
    organization_id: getOrgForUser(u.id),
    full_name: u.full_name,
    locale: "es",
    timezone: "America/Guayaquil",
    is_active: true,
  }));

  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(profileRows),
  });
}

function getOrgForUser(userId: string): string {
  // Map user IDs to their org IDs from seed data
  const orgMap: Record<string, string> = {
    "b0000000-0000-0000-0000-000000000001": "a0000000-0000-0000-0000-000000000001", // super_admin → ACME
    "b0000000-0000-0000-0000-000000000002": "a0000000-0000-0000-0000-000000000001", // company_admin → ACME
    "b0000000-0000-0000-0000-000000000003": "a0000000-0000-0000-0000-000000000001", // wh_admin MIA → ACME
    "b0000000-0000-0000-0000-000000000004": "a0000000-0000-0000-0000-000000000001", // wh_admin GYE → ACME
    "b0000000-0000-0000-0000-000000000005": "a0000000-0000-0000-0000-000000000001", // operator MIA → ACME
    "b0000000-0000-0000-0000-000000000006": "a0000000-0000-0000-0000-000000000001", // operator GYE → ACME
    "b0000000-0000-0000-0000-000000000007": "a0000000-0000-0000-0000-000000000001", // shipping → ACME
    "b0000000-0000-0000-0000-000000000008": "a0000000-0000-0000-0000-000000000001", // dest_admin EC → ACME
    "b0000000-0000-0000-0000-000000000009": "a0000000-0000-0000-0000-000000000001", // dest_admin CO → ACME
    "b0000000-0000-0000-0000-00000000000a": "a0000000-0000-0000-0000-000000000001", // agency Rapidito → ACME
    "b0000000-0000-0000-0000-00000000000b": "a0000000-0000-0000-0000-000000000001", // agency Box4You → ACME
    "b0000000-0000-0000-0000-00000000000c": "a0000000-0000-0000-0000-000000000002", // Globex admin → Globex
    "b0000000-0000-0000-0000-00000000000d": "a0000000-0000-0000-0000-000000000002", // Globex operator → Globex
    "b0000000-0000-0000-0000-00000000000e": "a0000000-0000-0000-0000-000000000003", // Pinnacle admin → Pinnacle
    "b0000000-0000-0000-0000-00000000000f": "a0000000-0000-0000-0000-000000000003", // Pinnacle agency → Pinnacle
  };
  return orgMap[userId] ?? "a0000000-0000-0000-0000-000000000001";
}

async function main() {
  if (!SERVICE_ROLE_KEY) {
    console.error(
      "\nError: Could not determine service_role key.\n" +
        "Ensure Supabase is running (`supabase start`) or set SUPABASE_SERVICE_ROLE_KEY.\n",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\nCreating ${users.length} test users via GoTrue Admin API`);
  console.log(`Target: ${SUPABASE_URL}\n`);

  // Clear orphaned profiles/roles that were inserted by seed.sql before auth.users existed
  console.log("  Clearing orphaned profiles & roles...");
  await clearOrphanedRows();

  // Create users sequentially to avoid rate limits
  for (const user of users) {
    await createUser(user);
  }

  // Re-seed profiles now that auth.users exist (FK will be satisfied)
  console.log("  Re-seeding profiles...");
  await reseedProfilesAndRoles();

  console.log("\nDone.\n");
}

main();
