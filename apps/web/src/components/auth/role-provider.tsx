"use client";

import type { Role } from "@no-wms/shared/constants/roles";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

interface RoleContextValue {
  roles: Role[];
  warehouseIds: string[] | null;
}

const RoleContext = createContext<RoleContextValue>({
  roles: [],
  warehouseIds: null,
});

export function RoleProvider({
  roles,
  warehouseIds,
  children,
}: {
  roles: Role[];
  warehouseIds: string[] | null;
  children: ReactNode;
}) {
  return (
    <RoleContext.Provider value={{ roles, warehouseIds }}>
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
