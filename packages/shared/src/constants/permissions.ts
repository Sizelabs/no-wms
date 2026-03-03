import type { Role } from "./roles";

export const RESOURCES = [
  "companies",
  "warehouses",
  "agencies",
  "users",
  "warehouse_receipts",
  "inventory",
  "work_orders",
  "shipping",
  "manifests",
  "tariffs",
  "invoicing",
  "tickets",
  "reports",
  "unknown_wrs",
  "settings",
  "consignees",
] as const;

export type Resource = (typeof RESOURCES)[number];

export type Permission = "create" | "read" | "update" | "delete";

export interface ResourcePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export type RolePermissionMap = Record<Resource, ResourcePermissions>;

export const RESOURCE_LABELS: Record<Resource, string> = {
  companies: "Empresas",
  warehouses: "Bodegas",
  agencies: "Agencias",
  users: "Usuarios",
  warehouse_receipts: "Recibos de Bodega",
  inventory: "Inventario",
  work_orders: "Órdenes de Trabajo",
  shipping: "Instrucciones de Embarque",
  manifests: "Manifiestos",
  tariffs: "Tarifas",
  invoicing: "Facturación",
  tickets: "Tickets",
  reports: "Reportes",
  unknown_wrs: "WRs Desconocidos",
  settings: "Configuración",
  consignees: "Consignatarios",
};

/** Maps nav item labels (i18n keys) to resource names for nav filtering */
export const NAV_RESOURCE_MAP: Record<string, Resource> = {
  companies: "companies",
  warehouses: "warehouses",
  agencies: "agencies",
  users: "users",
  consignees: "consignees",
  warehouseReceipts: "warehouse_receipts",
  inventory: "inventory",
  workOrders: "work_orders",
  shipping: "shipping",
  manifests: "manifests",
  tariffs: "tariffs",
  invoicing: "invoicing",
  tickets: "tickets",
  reports: "reports",
  unknownWrs: "unknown_wrs",
  settings: "settings",
};

function crud(c: boolean, r: boolean, u: boolean, d: boolean): ResourcePermissions {
  return { create: c, read: r, update: u, delete: d };
}

const NONE = crud(false, false, false, false);
const READ = crud(false, true, false, false);
const FULL = crud(true, true, true, true);

function makePermMap(overrides: Partial<Record<Resource, ResourcePermissions>>): RolePermissionMap {
  const base: RolePermissionMap = {} as RolePermissionMap;
  for (const r of RESOURCES) {
    base[r] = overrides[r] ?? NONE;
  }
  return base;
}

export const DEFAULT_PERMISSIONS: Record<Role, RolePermissionMap> = {
  super_admin: makePermMap(
    Object.fromEntries(RESOURCES.map((r) => [r, FULL])) as Record<Resource, ResourcePermissions>,
  ),

  company_admin: makePermMap({
    companies: crud(false, true, true, false),
    warehouses: FULL,
    agencies: FULL,
    users: FULL,
    warehouse_receipts: crud(true, true, true, false),
    inventory: READ,
    work_orders: crud(true, true, true, false),
    shipping: crud(true, true, true, false),
    manifests: crud(true, true, true, false),
    tariffs: crud(false, true, true, false),
    invoicing: crud(true, true, true, false),
    tickets: crud(true, true, true, false),
    reports: READ,
    unknown_wrs: crud(false, true, true, false),
    settings: crud(false, true, true, false),
    consignees: FULL,
  }),

  warehouse_admin: makePermMap({
    warehouses: crud(false, true, true, false),
    agencies: READ,
    warehouse_receipts: crud(true, true, true, false),
    inventory: READ,
    work_orders: crud(true, true, true, false),
    shipping: crud(true, true, true, false),
    manifests: crud(true, true, true, false),
    tickets: crud(true, true, true, false),
    reports: READ,
    unknown_wrs: crud(false, true, true, false),
    settings: crud(false, true, true, false),
    consignees: FULL,
  }),

  warehouse_operator: makePermMap({
    warehouse_receipts: crud(true, true, true, false),
    inventory: READ,
    work_orders: crud(false, true, true, false),
    manifests: READ,
    tickets: crud(true, true, false, false),
    unknown_wrs: crud(false, true, true, false),
  }),

  shipping_clerk: makePermMap({
    inventory: READ,
    shipping: crud(true, true, true, false),
    manifests: crud(true, true, true, false),
    tickets: crud(true, true, false, false),
    reports: READ,
  }),

  destination_admin: makePermMap({
    agencies: READ,
    consignees: READ,
    inventory: READ,
    shipping: crud(false, true, true, false),
    manifests: crud(false, true, true, false),
    tariffs: crud(false, true, true, false),
    invoicing: crud(true, true, true, false),
    tickets: crud(true, true, true, false),
    reports: READ,
    unknown_wrs: crud(false, true, true, false),
    settings: crud(false, true, true, false),
  }),

  destination_operator: makePermMap({
    agencies: READ,
    inventory: READ,
    shipping: READ,
    manifests: READ,
    tickets: crud(true, true, false, false),
    reports: READ,
    unknown_wrs: crud(false, true, true, false),
  }),

  agency: makePermMap({
    consignees: READ,
    inventory: READ,
    work_orders: crud(true, true, false, false),
    shipping: crud(true, true, false, false),
    manifests: READ,
    invoicing: READ,
    tariffs: READ,
    tickets: crud(true, true, false, false),
    unknown_wrs: crud(false, true, true, false),
  }),
};
