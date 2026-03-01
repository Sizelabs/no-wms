export const ROLES = {
  SUPER_ADMIN: "super_admin",
  COMPANY_ADMIN: "company_admin",
  WAREHOUSE_ADMIN: "warehouse_admin",
  WAREHOUSE_OPERATOR: "warehouse_operator",
  SHIPPING_CLERK: "shipping_clerk",
  DESTINATION_ADMIN: "destination_admin",
  DESTINATION_OPERATOR: "destination_operator",
  AGENCY: "agency",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  company_admin: "Administrador de Empresa",
  warehouse_admin: "Administrador de Bodega",
  warehouse_operator: "Operario de Bodega",
  shipping_clerk: "Shipping Clerk",
  destination_admin: "Administrador en Destino",
  destination_operator: "Operario en Destino",
  agency: "Agencia Subcourier",
};

/** Company-level role (manages all warehouses + agencies) */
export const COMPANY_ROLES: Role[] = [
  ROLES.COMPANY_ADMIN,
];

/** Roles that belong to origin (warehouse) */
export const ORIGIN_ROLES: Role[] = [
  ROLES.WAREHOUSE_ADMIN,
  ROLES.WAREHOUSE_OPERATOR,
  ROLES.SHIPPING_CLERK,
];

/** Roles that belong to destination */
export const DESTINATION_ROLES: Role[] = [
  ROLES.DESTINATION_ADMIN,
  ROLES.DESTINATION_OPERATOR,
];
