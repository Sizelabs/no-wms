/**
 * seed-auth.ts — Create test users via Supabase GoTrue Admin API
 *
 * 20 users (2 per role) across 3 orgs. Pairs with seed.sql.
 *
 * Usage (local):
 *   supabase db reset          # runs migrations + seed.sql
 *   npx tsx scripts/seed-auth.ts
 *
 * Usage (staging — jyjqwfpqlmqkxglnqemg):
 *   cd packages/supabase && supabase db reset --linked --yes
 *   supabase projects api-keys --project-ref jyjqwfpqlmqkxglnqemg
 *   NEXT_PUBLIC_SUPABASE_URL="https://jyjqwfpqlmqkxglnqemg.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
 *   npx tsx scripts/seed-auth.ts
 *
 * Password for ALL test users: TestPassword1234
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
  org_id: string | null;
}

// ---------------------------------------------------------------------------
// 20 users: 2 per role for ACME, plus Globex & Pinnacle admins
// ---------------------------------------------------------------------------
const ORG_ACME = "a0000000-0000-0000-0000-000000000001";
const ORG_GLOBEX = "a0000000-0000-0000-0000-000000000002";
const ORG_PINNACLE = "a0000000-0000-0000-0000-000000000003";

const users: SeedUser[] = [
  // ── Platform-level (no org) ────────────────────────────────────────────
  // super_admin × 2
  { id: "b0000000-0000-0000-0000-000000000001", email: "superadmin@test.nowms.dev",      full_name: "Carlos Rivera",       org_id: null },
  { id: "b0000000-0000-0000-0000-000000000002", email: "superadmin2@test.nowms.dev",     full_name: "Maria Espinoza",      org_id: null },
  // forwarder_admin × 2
  { id: "b0000000-0000-0000-0000-000000000003", email: "companyadmin@test.nowms.dev",    full_name: "Roberto Salazar",     org_id: ORG_ACME },
  { id: "b0000000-0000-0000-0000-000000000004", email: "companyadmin2@test.nowms.dev",   full_name: "Diana Morales",       org_id: ORG_ACME },
  // warehouse_admin × 2
  { id: "b0000000-0000-0000-0000-000000000005", email: "whadmin.mia@test.nowms.dev",     full_name: "James Wilson",        org_id: ORG_ACME },
  { id: "b0000000-0000-0000-0000-000000000006", email: "whadmin.gye@test.nowms.dev",     full_name: "Pedro Aguirre",       org_id: ORG_ACME },
  // warehouse_operator × 2
  { id: "b0000000-0000-0000-0000-000000000007", email: "operator.mia@test.nowms.dev",    full_name: "Sarah Johnson",       org_id: ORG_ACME },
  { id: "b0000000-0000-0000-0000-000000000008", email: "operator.gye@test.nowms.dev",    full_name: "Luis Zambrano",       org_id: ORG_ACME },
  // shipping_clerk × 2
  { id: "b0000000-0000-0000-0000-000000000009", email: "shipping.mia@test.nowms.dev",    full_name: "Michael Chen",        org_id: ORG_ACME },
  { id: "b0000000-0000-0000-0000-00000000000a", email: "shipping.gye@test.nowms.dev",    full_name: "Andrea Pacheco",      org_id: ORG_ACME },
  // destination_admin × 2
  { id: "b0000000-0000-0000-0000-00000000000b", email: "destadmin.ec@test.nowms.dev",    full_name: "Fernando Arias",      org_id: ORG_ACME },
  { id: "b0000000-0000-0000-0000-00000000000c", email: "destadmin.co@test.nowms.dev",    full_name: "Valentina Gomez",     org_id: ORG_ACME },
  // destination_operator × 2
  { id: "b0000000-0000-0000-0000-00000000000d", email: "destop.ec@test.nowms.dev",       full_name: "Camila Herrera",      org_id: ORG_ACME },
  { id: "b0000000-0000-0000-0000-00000000000e", email: "destop.co@test.nowms.dev",       full_name: "Andres Lopez",        org_id: ORG_ACME },
  // agency × 2
  { id: "b0000000-0000-0000-0000-00000000000f", email: "agency.rapidito@test.nowms.dev", full_name: "Gloria Mendoza",      org_id: ORG_ACME },
  { id: "b0000000-0000-0000-0000-000000000010", email: "agency.box4you@test.nowms.dev",  full_name: "Ricardo Paredes",     org_id: ORG_ACME },

  // ── Globex Trading (2 users) ───────────────────────────────────────────
  { id: "b0000000-0000-0000-0000-000000000011", email: "globex.admin@test.nowms.dev",    full_name: "David Park",          org_id: ORG_GLOBEX },
  { id: "b0000000-0000-0000-0000-000000000012", email: "globex.operator@test.nowms.dev", full_name: "Jennifer Lee",        org_id: ORG_GLOBEX },

  // ── Pinnacle Freight (2 users) ─────────────────────────────────────────
  { id: "b0000000-0000-0000-0000-000000000013", email: "pinnacle.admin@test.nowms.dev",  full_name: "Thomas Brown",        org_id: ORG_PINNACLE },
  { id: "b0000000-0000-0000-0000-000000000014", email: "pinnacle.agency@test.nowms.dev", full_name: "Sofia Mendez",        org_id: ORG_PINNACLE },
];

// ---------------------------------------------------------------------------
// GoTrue Admin API helpers
// ---------------------------------------------------------------------------

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
  const userIds = users.map((u) => u.id).join(",");

  for (const table of ["notification_preferences", "user_roles", "profiles"]) {
    const filterCol = table === "profiles" ? "id" : "user_id";
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?${filterCol}=in.(${encodeURIComponent(userIds)})`,
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
      console.warn(`  ! Could not clean ${table}: ${res.status}`);
    }
  }
}

interface SeedUserRole {
  user_id: string;
  organization_id: string | null;
  role: string;
  warehouse_id: string | null;
  destination_id: string | null;
  agency_id: string | null;
  courier_id: string | null;
}

function getUserRoles(): SeedUserRole[] {
  return [
    // super_admin × 2 — platform-level, no org
    { user_id: "b0000000-0000-0000-0000-000000000001", organization_id: null,         role: "super_admin",          warehouse_id: null,                                   destination_id: null,                                   agency_id: null,                                   courier_id: null },
    { user_id: "b0000000-0000-0000-0000-000000000002", organization_id: null,         role: "super_admin",          warehouse_id: null,                                   destination_id: null,                                   agency_id: null,                                   courier_id: null },
    // forwarder_admin × 2
    { user_id: "b0000000-0000-0000-0000-000000000003", organization_id: ORG_ACME,     role: "forwarder_admin",      warehouse_id: null,                                   destination_id: null,                                   agency_id: null,                                   courier_id: null },
    { user_id: "b0000000-0000-0000-0000-000000000004", organization_id: ORG_ACME,     role: "forwarder_admin",      warehouse_id: null,                                   destination_id: null,                                   agency_id: null,                                   courier_id: null },
    // warehouse_admin × 2
    { user_id: "b0000000-0000-0000-0000-000000000005", organization_id: ORG_ACME,     role: "warehouse_admin",      warehouse_id: "c0000000-0000-0000-0000-000000000001", destination_id: null,                                   agency_id: null,                                   courier_id: null },
    { user_id: "b0000000-0000-0000-0000-000000000006", organization_id: ORG_ACME,     role: "warehouse_admin",      warehouse_id: "c0000000-0000-0000-0000-000000000002", destination_id: null,                                   agency_id: null,                                   courier_id: null },
    // warehouse_operator × 2
    { user_id: "b0000000-0000-0000-0000-000000000007", organization_id: ORG_ACME,     role: "warehouse_operator",   warehouse_id: "c0000000-0000-0000-0000-000000000001", destination_id: null,                                   agency_id: null,                                   courier_id: null },
    { user_id: "b0000000-0000-0000-0000-000000000008", organization_id: ORG_ACME,     role: "warehouse_operator",   warehouse_id: "c0000000-0000-0000-0000-000000000002", destination_id: null,                                   agency_id: null,                                   courier_id: null },
    // shipping_clerk × 2
    { user_id: "b0000000-0000-0000-0000-000000000009", organization_id: ORG_ACME,     role: "shipping_clerk",       warehouse_id: "c0000000-0000-0000-0000-000000000001", destination_id: null,                                   agency_id: null,                                   courier_id: null },
    { user_id: "b0000000-0000-0000-0000-00000000000a", organization_id: ORG_ACME,     role: "shipping_clerk",       warehouse_id: "c0000000-0000-0000-0000-000000000002", destination_id: null,                                   agency_id: null,                                   courier_id: null },
    // destination_admin × 2
    { user_id: "b0000000-0000-0000-0000-00000000000b", organization_id: ORG_ACME,     role: "destination_admin",    warehouse_id: null,                                   destination_id: "f0000000-0000-0000-0000-000000000001", agency_id: null,                                   courier_id: "d2000000-0000-0000-0000-000000000001" },
    { user_id: "b0000000-0000-0000-0000-00000000000c", organization_id: ORG_ACME,     role: "destination_admin",    warehouse_id: null,                                   destination_id: "f0000000-0000-0000-0000-000000000002", agency_id: null,                                   courier_id: "d2000000-0000-0000-0000-000000000002" },
    // destination_operator × 2
    { user_id: "b0000000-0000-0000-0000-00000000000d", organization_id: ORG_ACME,     role: "destination_operator", warehouse_id: null,                                   destination_id: "f0000000-0000-0000-0000-000000000001", agency_id: null,                                   courier_id: "d2000000-0000-0000-0000-000000000001" },
    { user_id: "b0000000-0000-0000-0000-00000000000e", organization_id: ORG_ACME,     role: "destination_operator", warehouse_id: null,                                   destination_id: "f0000000-0000-0000-0000-000000000002", agency_id: null,                                   courier_id: "d2000000-0000-0000-0000-000000000002" },
    // agency × 2
    { user_id: "b0000000-0000-0000-0000-00000000000f", organization_id: ORG_ACME,     role: "agency",               warehouse_id: null,                                   destination_id: null,                                   agency_id: "f2000000-0000-0000-0000-000000000001", courier_id: null },
    { user_id: "b0000000-0000-0000-0000-000000000010", organization_id: ORG_ACME,     role: "agency",               warehouse_id: null,                                   destination_id: null,                                   agency_id: "f2000000-0000-0000-0000-000000000002", courier_id: null },
    // Globex
    { user_id: "b0000000-0000-0000-0000-000000000011", organization_id: ORG_GLOBEX,   role: "forwarder_admin",      warehouse_id: null,                                   destination_id: null,                                   agency_id: null,                                   courier_id: null },
    { user_id: "b0000000-0000-0000-0000-000000000012", organization_id: ORG_GLOBEX,   role: "warehouse_operator",   warehouse_id: "c0000000-0000-0000-0000-000000000004", destination_id: null,                                   agency_id: null,                                   courier_id: null },
    // Pinnacle
    { user_id: "b0000000-0000-0000-0000-000000000013", organization_id: ORG_PINNACLE, role: "forwarder_admin",      warehouse_id: null,                                   destination_id: null,                                   agency_id: null,                                   courier_id: null },
    { user_id: "b0000000-0000-0000-0000-000000000014", organization_id: ORG_PINNACLE, role: "agency",               warehouse_id: null,                                   destination_id: null,                                   agency_id: "f2000000-0000-0000-0000-000000000008", courier_id: null },
  ];
}

async function reseedProfilesAndRoles(): Promise<void> {
  const profileRows = users.map((u) => ({
    id: u.id,
    organization_id: u.org_id,
    full_name: u.full_name,
    locale: "es",
    timezone: "America/Guayaquil",
    is_active: true,
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(profileRows),
  });

  if (!res.ok) {
    console.error(`  ! Profile upsert failed: ${res.status}`);
  }

  // Re-seed user_roles (cleared by clearOrphanedRows)
  const roleRows = getUserRoles();
  const rolesRes = await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(roleRows),
  });

  if (!rolesRes.ok) {
    console.error(`  ! user_roles upsert failed: ${rolesRes.status}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

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

  console.log("  Clearing orphaned profiles & roles...");
  await clearOrphanedRows();

  for (const user of users) {
    await createUser(user);
  }

  console.log("  Re-seeding profiles...");
  await reseedProfilesAndRoles();

  console.log("\nDone.\n");
}

main();
