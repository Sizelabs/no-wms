import type { Role } from "./roles";

export const RESOURCES = [
  "forwarders",
  "warehouses",
  "couriers",
  "carriers",
  "agencies",
  "users",
  "warehouse_receipts",
  "inventory",
  "work_orders",
  "shipping",
  "shipments",
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
  "destinations",
  "locations",
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
  carriers: "Transportistas",
  agencies: "Agencias",
  users: "Usuarios",
  warehouse_receipts: "Recibos de Bodega",
  inventory: "Inventario",
  work_orders: "Órdenes de Trabajo",
  shipping: "Instrucciones de Embarque",
  shipments: "Embarques",
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
  destinations: "Destinos",
  locations: "Ubicaciones",
};

/** Maps nav item labels (i18n keys) to resource names for nav filtering */
export const NAV_RESOURCE_MAP: Record<string, Resource> = {
  forwarders: "forwarders",
  warehouses: "warehouses",
  couriers: "couriers",
  carriers: "carriers",
  agencies: "agencies",
  users: "users",
  consignees: "consignees",
  warehouseReceipts: "warehouse_receipts",
  inventory: "inventory",
  workOrders: "work_orders",
  shipping: "shipping",
  shipments: "shipments",
  tariffs: "tariffs",
  invoicing: "invoicing",
  tickets: "tickets",
  reports: "reports",
  unknownWrs: "unknown_wrs",
  settings: "settings",
  history: "history",
  locations: "locations",
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
    carriers: crud(true, true, true, false),
    agencies: FULL,
    users: FULL,
    warehouse_receipts: crud(true, true, true, false),
    inventory: READ,
    work_orders: crud(true, true, true, false),
    shipping: crud(true, true, true, false),
    shipments: crud(true, true, true, false),
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
    destinations: FULL,
    locations: FULL,
  }),

  warehouse_admin: makePermMap({
    warehouses: crud(false, true, true, false),
    couriers: READ,
    agencies: READ,
    warehouse_receipts: crud(true, true, true, false),
    inventory: READ,
    work_orders: crud(true, true, true, false),
    shipping: crud(true, true, true, false),
    shipments: crud(true, true, true, false),
    tickets: crud(true, true, true, false),
    reports: READ,
    unknown_wrs: crud(false, true, true, false),
    settings: crud(false, true, true, false),
    consignees: FULL,
    history: READ,
    locations: crud(true, true, true, false),
  }),

  warehouse_operator: makePermMap({
    warehouse_receipts: crud(true, true, true, false),
    inventory: READ,
    work_orders: crud(false, true, true, false),
    shipments: READ,
    tickets: crud(true, true, false, false),
    unknown_wrs: crud(false, true, true, false),
    consignees: READ,
    history: READ,
    locations: crud(false, true, true, false),
  }),

  shipping_clerk: makePermMap({
    inventory: READ,
    shipping: crud(true, true, true, false),
    shipments: crud(true, true, true, false),
    tickets: crud(true, true, false, false),
    reports: READ,
    history: READ,
  }),

  destination_admin: makePermMap({
    couriers: crud(false, true, true, false),
    carriers: READ,
    agencies: FULL,
    consignees: FULL,
    warehouse_receipts: READ,
    inventory: READ,
    work_orders: crud(true, true, false, false),
    shipping: crud(false, true, true, false),
    shipments: crud(false, true, true, false),
    tariffs: crud(false, true, true, false),
    invoicing: crud(true, true, true, false),
    tickets: crud(true, true, true, false),
    reports: READ,
    unknown_wrs: crud(false, true, true, false),
    settings: crud(false, true, true, false),
    history: READ,
    handling_costs: READ,
    modalities: READ,
    destinations: READ,
  }),

  destination_operator: makePermMap({
    couriers: READ,
    agencies: READ,
    inventory: READ,
    shipping: READ,
    shipments: READ,
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
    shipments: READ,
    invoicing: READ,
    tariffs: READ,
    tickets: crud(true, true, false, false),
    unknown_wrs: crud(false, true, true, false),
    history: READ,
    handling_costs: READ,
    modalities: READ,
  }),
};
