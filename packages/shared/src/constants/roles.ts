export const ROLES = {
  SUPER_ADMIN: "super_admin",
  FORWARDER_ADMIN: "forwarder_admin",
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
  forwarder_admin: "Freight Forwarder Admin",
  warehouse_admin: "Administrador de Bodega",
  warehouse_operator: "Operario de Bodega",
  shipping_clerk: "Shipping Clerk",
  destination_admin: "Administrador en Destino",
  destination_operator: "Operario en Destino",
  agency: "Agencia Subcourier",
};

/** Forwarder-level role (manages all warehouses + agencies) */
export const FORWARDER_ROLES: Role[] = [
  ROLES.FORWARDER_ADMIN,
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

/** Roles on the forwarder side that can finalize shipping instructions */
export const FORWARDER_SIDE_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.FORWARDER_ADMIN,
  ROLES.WAREHOUSE_ADMIN,
  ROLES.SHIPPING_CLERK,
];
