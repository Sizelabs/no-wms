export const WORK_ORDER_TYPES = {
  ABANDON: "abandon",
  GROUP: "group",
  AUTHORIZE_PICKUP: "authorize_pickup",
  CONSOLIDATE: "consolidate",
  DELIVERY: "delivery",
  DIVIDE: "divide",
  SHIP: "ship",
  PHOTOS: "photos",
  INSPECTION: "inspection",
  INVENTORY_COUNT: "inventory_count",
  REPACK: "repack",
  RETURN: "return",
  SPECIAL_REQUEST: "special_request",
} as const;

export type WorkOrderType =
  (typeof WORK_ORDER_TYPES)[keyof typeof WORK_ORDER_TYPES];

export const WORK_ORDER_TYPE_LABELS: Record<WorkOrderType, string> = {
  abandon: "Abandono",
  group: "Agrupar",
  authorize_pickup: "Autorizar Retiro",
  consolidate: "Consolidar",
  delivery: "Delivery",
  divide: "Dividir",
  ship: "Enviar",
  photos: "Fotos",
  inspection: "Inspección",
  inventory_count: "Inventario",
  repack: "Reempacar",
  return: "Retorno",
  special_request: "Solicitud Especial",
};

/** Minimum number of WRs required per work order type */
export const WO_MIN_WRS: Partial<Record<WorkOrderType, number>> = {
  group: 2,
  consolidate: 2,
  divide: 1,
};

/** Work order types that require admin approval */
export const WO_REQUIRES_ADMIN_APPROVAL: WorkOrderType[] = ["abandon"];
