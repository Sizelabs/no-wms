"use client";

import type { Role } from "@no-wms/shared/constants/roles";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const RoleContext = createContext<Role[]>([]);

export function RoleProvider({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  return <RoleContext.Provider value={roles}>{children}</RoleContext.Provider>;
}

export function useUserRoles(): Role[] {
  return useContext(RoleContext);
}
