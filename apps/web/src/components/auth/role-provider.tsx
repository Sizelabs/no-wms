"use client";

import type { RolePermissionMap } from "@no-wms/shared/constants/permissions";
import type { Role } from "@no-wms/shared/constants/roles";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

interface RoleContextValue {
  roles: Role[];
  warehouseIds: string[] | null;
  courierIds: string[] | null;
  agencyIds: string[] | null;
  permissions: RolePermissionMap | null;
}

const RoleContext = createContext<RoleContextValue>({
  roles: [],
  warehouseIds: null,
  courierIds: null,
  agencyIds: null,
  permissions: null,
});

export function RoleProvider({
  roles,
  warehouseIds,
  courierIds,
  agencyIds,
  permissions,
  children,
}: {
  roles: Role[];
  warehouseIds: string[] | null;
  courierIds: string[] | null;
  agencyIds: string[] | null;
  permissions: RolePermissionMap;
  children: ReactNode;
}) {
  return (
    <RoleContext.Provider value={{ roles, warehouseIds, courierIds, agencyIds, permissions }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useUserRoles(): Role[] {
  return useContext(RoleContext).roles;
}

/**
 * Returns the warehouse IDs the current user is scoped to.
 * null = unscoped (sees all warehouses).
 * string[] = scoped to specific warehouses.
 */
export function useWarehouseScope(): string[] | null {
  return useContext(RoleContext).warehouseIds;
}

/**
 * Returns the courier IDs the current user is scoped to.
 * null = not a destination user (sees all).
 * string[] = scoped to specific couriers.
 */
export function useCourierScope(): string[] | null {
  return useContext(RoleContext).courierIds;
}

/**
 * Returns the agency IDs the current user is scoped to.
 * null = not an agency user (sees all).
 * string[] = scoped to specific agencies.
 */
export function useAgencyScope(): string[] | null {
  return useContext(RoleContext).agencyIds;
}

/**
 * Returns the resolved permission map for the current user's primary role.
 * Merges DB overrides with defaults.
 */
export function usePermissions(): RolePermissionMap | null {
  return useContext(RoleContext).permissions;
}
