import { getAuthContext } from "@/lib/auth/context";
import { getScopedAgencyIds, getScopedCourierIds, getScopedWarehouseIds } from "@/lib/auth/roles";

interface UserScope {
  warehouseIds: string[] | null;
  courierIds: string[] | null;
  agencyIds: string[] | null;
}

/**
 * Server-side helper: returns the warehouse IDs the current user is scoped to.
 * - Returns null for unscoped users (super_admin, forwarder_admin) → sees all warehouses.
 * - Returns string[] for warehouse-scoped users.
 * - Returns [] (empty array) if user is not authenticated, which effectively shows nothing.
 */
export async function getUserWarehouseScope(): Promise<string[] | null> {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  return getScopedWarehouseIds(ctx.assignments);
}

/**
 * Server-side helper: returns the courier IDs the current user is scoped to.
 * - Returns null for non-destination users → sees all couriers.
 * - Returns string[] for destination-scoped users.
 * - Returns [] if user is not authenticated.
 */
export async function getUserCourierScope(): Promise<string[] | null> {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  return getScopedCourierIds(ctx.assignments);
}

/**
 * Server-side helper: returns the agency IDs the current user is scoped to.
 * - Returns null for non-agency users → sees all agencies / all WRs.
 * - Returns string[] for agency-scoped users.
 * - Returns [] if user is not authenticated.
 */
export async function getUserAgencyScope(): Promise<string[] | null> {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  return getScopedAgencyIds(ctx.assignments);
}

/**
 * Returns warehouse, courier, and agency scopes in a single call (avoids duplicate DB queries).
 */
export async function getUserFullScope(): Promise<UserScope> {
  const ctx = await getAuthContext();
  if (!ctx) return { warehouseIds: [], courierIds: [], agencyIds: [] };
  return {
    warehouseIds: ctx.warehouseIds,
    courierIds: ctx.courierIds,
    agencyIds: ctx.agencyIds,
  };
}

/** Roles that only manage the forwarder→courier side */
const FORWARDER_SIDE_ROLES = new Set([
  "forwarder_admin",
  "warehouse_admin",
  "warehouse_operator",
  "shipping_clerk",
]);

/** Roles that only manage the courier→agency side */
const COURIER_SIDE_ROLES = new Set([
  "destination_admin",
  "destination_operator",
  "agency",
]);

/**
 * Returns the tariff side(s) the current user is allowed to access.
 * - `null` for super_admin (sees both sides)
 * - A specific side for scoped roles
 */
export async function getUserAllowedTariffSide(): Promise<string | null> {
  const ctx = await getAuthContext();
  if (!ctx || ctx.assignments.length === 0) return null; // super_admin

  const roles = ctx.roles;

  if (roles.some((r) => r === "super_admin")) return null;
  if (roles.some((r) => FORWARDER_SIDE_ROLES.has(r))) return "forwarder_to_courier";
  if (roles.some((r) => COURIER_SIDE_ROLES.has(r))) return "courier_to_agency";

  return null;
}
