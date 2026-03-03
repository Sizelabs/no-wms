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

/** Maximum number of WRs allowed per work order type (undefined = no limit) */
export const WO_MAX_WRS: Partial<Record<WorkOrderType, number>> = {
  divide: 1,
};

/** Work order types that require admin approval */
export const WO_REQUIRES_ADMIN_APPROVAL: WorkOrderType[] = ["abandon"];

/** Short descriptions for each work order type */
export const WO_TYPE_DESCRIPTIONS: Record<WorkOrderType, string> = {
  abandon: "Descartar paquetes permanentemente",
  group: "Agrupar paquetes bajo una sola guia",
  authorize_pickup: "Autorizar retiro presencial",
  consolidate: "Combinar contenidos en un solo paquete",
  delivery: "Entrega a domicilio",
  divide: "Dividir paquete en partes separadas",
  ship: "Preparar y despachar via transportista",
  photos: "Solicitar fotografias del paquete",
  inspection: "Inspeccion detallada con documentacion",
  inventory_count: "Conteo e inventario de contenido",
  repack: "Reempacar en nuevo empaque",
  return: "Devolucion al proveedor con etiqueta",
  special_request: "Solicitud personalizada",
};

/** All services available in the WR action bar, in display order */
export const WR_ACTION_BAR_SERVICES: WorkOrderType[] = [
  "ship",
  "consolidate",
  "group",
  "photos",
  "repack",
  "divide",
  "inspection",
  "inventory_count",
  "return",
  "special_request",
  "abandon",
];
