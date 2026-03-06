import type { Role } from "./roles";

export const RESOURCES = [
  "forwarders",
  "warehouses",
  "couriers",
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
  "history",
  "handling_costs",
  "modalities",
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
  forwarders: "Freight Forwarders",
  warehouses: "Bodegas",
  couriers: "Couriers",
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
  history: "Historial",
  handling_costs: "Costos de Manejo",
  modalities: "Modalidades de Envío",
};

/** Maps nav item labels (i18n keys) to resource names for nav filtering */
export const NAV_RESOURCE_MAP: Record<string, Resource> = {
  forwarders: "forwarders",
  warehouses: "warehouses",
  couriers: "couriers",
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
  history: "history",
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

  forwarder_admin: makePermMap({
    forwarders: crud(false, true, true, false),
    warehouses: FULL,
    couriers: FULL,
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
    history: READ,
    handling_costs: FULL,
    modalities: FULL,
  }),

  warehouse_admin: makePermMap({
    warehouses: crud(false, true, true, false),
    couriers: READ,
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
    history: READ,
  }),

  warehouse_operator: makePermMap({
    warehouse_receipts: crud(true, true, true, false),
    inventory: READ,
    work_orders: crud(false, true, true, false),
    manifests: READ,
    tickets: crud(true, true, false, false),
    unknown_wrs: crud(false, true, true, false),
    consignees: READ,
    history: READ,
  }),

  shipping_clerk: makePermMap({
    inventory: READ,
    shipping: crud(true, true, true, false),
    manifests: crud(true, true, true, false),
    tickets: crud(true, true, false, false),
    reports: READ,
    history: READ,
  }),

  destination_admin: makePermMap({
    couriers: crud(false, true, true, false),
    agencies: FULL,
    consignees: FULL,
    warehouse_receipts: READ,
    inventory: READ,
    work_orders: READ,
    shipping: crud(false, true, true, false),
    manifests: crud(false, true, true, false),
    tariffs: crud(false, true, true, false),
    invoicing: crud(true, true, true, false),
    tickets: crud(true, true, true, false),
    reports: READ,
    unknown_wrs: crud(false, true, true, false),
    settings: crud(false, true, true, false),
    history: READ,
    handling_costs: READ,
    modalities: READ,
  }),

  destination_operator: makePermMap({
    couriers: READ,
    agencies: READ,
    inventory: READ,
    shipping: READ,
    manifests: READ,
    tickets: crud(true, true, false, false),
    reports: READ,
    unknown_wrs: crud(false, true, true, false),
    history: READ,
  }),

  agency: makePermMap({
    consignees: crud(true, true, true, false),
    inventory: READ,
    work_orders: crud(true, true, false, false),
    shipping: crud(true, true, false, false),
    manifests: READ,
    invoicing: READ,
    tariffs: READ,
    tickets: crud(true, true, false, false),
    unknown_wrs: crud(false, true, true, false),
    history: READ,
    handling_costs: READ,
    modalities: READ,
  }),
};
