// ── WR (Warehouse Receipt) statuses ──
export const WR_STATUSES = {
  RECEIVED: "received",
  IN_WAREHOUSE: "in_warehouse",
  IN_WORK_ORDER: "in_work_order",
  IN_DISPATCH: "in_dispatch",
  DISPATCHED: "dispatched",
  DAMAGED: "damaged",
  ABANDONED: "abandoned",
} as const;

export type WrStatus = (typeof WR_STATUSES)[keyof typeof WR_STATUSES];

export const WR_STATUS_LABELS: Record<WrStatus, string> = {
  received: "Recibida",
  in_warehouse: "En Bodega",
  in_work_order: "En Orden de Trabajo",
  in_dispatch: "En Despacho",
  dispatched: "Despachada",
  damaged: "Dañada",
  abandoned: "Abandono",
};

// ── Work Order statuses ──
export const WO_STATUSES = {
  REQUESTED: "requested",
  APPROVED: "approved",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  PENDING: "pending",
} as const;

export type WoStatus = (typeof WO_STATUSES)[keyof typeof WO_STATUSES];

export const WO_STATUS_LABELS: Record<WoStatus, string> = {
  requested: "Solicitada",
  approved: "Aprobada",
  in_progress: "En Progreso",
  completed: "Completada",
  cancelled: "Cancelada",
  pending: "Pendiente",
};

// ── Shipping Instruction statuses ──
export const SI_STATUSES = {
  REQUESTED: "requested",
  APPROVED: "approved",
  FINALIZED: "finalized",
  MANIFESTED: "manifested",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

export type SiStatus = (typeof SI_STATUSES)[keyof typeof SI_STATUSES];

export const SI_STATUS_LABELS: Record<SiStatus, string> = {
  requested: "Solicitada",
  approved: "Aprobada",
  finalized: "Finalizada",
  manifested: "Manifestada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

// ── MAWB statuses ──
export const MAWB_STATUSES = {
  CREATED: "created",
  READY_FOR_FLIGHT: "ready_for_flight",
  IN_TRANSIT: "in_transit",
  ARRIVED: "arrived",
  DELIVERED: "delivered",
} as const;

export type MawbStatus = (typeof MAWB_STATUSES)[keyof typeof MAWB_STATUSES];

export const MAWB_STATUS_LABELS: Record<MawbStatus, string> = {
  created: "Creado",
  ready_for_flight: "Listo para Vuelo",
  in_transit: "En Tránsito",
  arrived: "Arribado",
  delivered: "Entregado",
};

// ── Ticket statuses ──
export const TICKET_STATUSES = {
  OPEN: "open",
  IN_REVIEW: "in_review",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type TicketStatus =
  (typeof TICKET_STATUSES)[keyof typeof TICKET_STATUSES];

// ── Invoice statuses ──
export const INVOICE_STATUSES = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  VOID: "void",
} as const;

export type InvoiceStatus =
  (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES];

// ── Pickup request statuses ──
export const PICKUP_STATUSES = {
  REQUESTED: "requested",
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type PickupStatus =
  (typeof PICKUP_STATUSES)[keyof typeof PICKUP_STATUSES];

// ── Invoice status labels ──
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  paid: "Pagada",
  overdue: "Vencida",
  void: "Anulada",
};

// ── Invoice line item types ──
export const INVOICE_LINE_ITEM_TYPES = {
  SHIPPING: "shipping",
  STORAGE: "storage",
  WORK_ORDER: "work_order",
  SURCHARGE: "surcharge",
  OTHER: "other",
} as const;

export type InvoiceLineItemType =
  (typeof INVOICE_LINE_ITEM_TYPES)[keyof typeof INVOICE_LINE_ITEM_TYPES];

export const INVOICE_LINE_ITEM_TYPE_LABELS: Record<InvoiceLineItemType, string> = {
  shipping: "Envío",
  storage: "Almacenaje",
  work_order: "Orden de Trabajo",
  surcharge: "Recargo",
  other: "Otro",
};
