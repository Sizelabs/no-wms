/**
 * seed-auth.ts — Create test users via Supabase GoTrue Admin API
 *
 * Raw SQL inserts into auth.users break GoTrue's internal schema.
 * This script uses the Admin API to create users properly.
 *
 * Usage:
 *   npx tsx packages/supabase/scripts/seed-auth.ts
 *
 * Requires env vars (reads from apps/web/.env.staging by default):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://YOUR_PROJECT.supabase.co";
const SERVICE_ROLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  "REMOVED_SECRET";

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

async function main() {
  console.log(`\nCreating ${users.length} test users via GoTrue Admin API`);
  console.log(`Target: ${SUPABASE_URL}\n`);

  // Create users sequentially to avoid rate limits
  for (const user of users) {
    await createUser(user);
  }

  console.log("\nDone.\n");
}

main();
