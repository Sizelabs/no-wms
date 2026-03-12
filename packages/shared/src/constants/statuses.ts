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

// ── Shipment statuses ──
export const SHIPMENT_STATUSES = {
  DRAFT: "draft",
  BOOKING_CONFIRMED: "booking_confirmed",
  CARGO_RECEIVED: "cargo_received",
  DEPARTED: "departed",
  IN_TRANSIT: "in_transit",
  VESSEL_LOADED: "vessel_loaded",
  TRANSHIPMENT: "transhipment",
  AT_PORT: "at_port",
  ARRIVED: "arrived",
  CUSTOMS_CLEARANCE: "customs_clearance",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[keyof typeof SHIPMENT_STATUSES];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: "Borrador",
  booking_confirmed: "Reserva Confirmada",
  cargo_received: "Carga Recibida",
  departed: "Despachado",
  in_transit: "En Tránsito",
  vessel_loaded: "Cargado en Buque",
  transhipment: "Transbordo",
  at_port: "En Puerto",
  arrived: "Arribado",
  customs_clearance: "Desaduanización",
  out_for_delivery: "En Reparto",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export type ShipmentModality = "air" | "ocean" | "ground";

/** Modality-aware next-status maps */
export const SHIPMENT_STATUS_FLOW: Record<ShipmentModality, Partial<Record<ShipmentStatus, ShipmentStatus>>> = {
  air: {
    draft: "booking_confirmed",
    booking_confirmed: "cargo_received",
    cargo_received: "departed",
    departed: "in_transit",
    in_transit: "arrived",
    arrived: "customs_clearance",
    customs_clearance: "delivered",
  },
  ocean: {
    draft: "booking_confirmed",
    booking_confirmed: "cargo_received",
    cargo_received: "vessel_loaded",
    vessel_loaded: "in_transit",
    in_transit: "transhipment",
    transhipment: "at_port",
    at_port: "arrived",
    arrived: "customs_clearance",
    customs_clearance: "delivered",
  },
  ground: {
    draft: "booking_confirmed",
    booking_confirmed: "cargo_received",
    cargo_received: "departed",
    departed: "in_transit",
    in_transit: "arrived",
    arrived: "out_for_delivery",
    out_for_delivery: "delivered",
  },
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

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Abierto",
  in_review: "En Revisión",
  resolved: "Resuelto",
  closed: "Cerrado",
};

// ── Ticket priorities ──
export const TICKET_PRIORITIES = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TicketPriority =
  (typeof TICKET_PRIORITIES)[keyof typeof TICKET_PRIORITIES];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

// ── Ticket categories ──
export const TICKET_CATEGORIES = [
  "Paquete danado",
  "Paquete extraviado",
  "Consulta general",
  "Reclamo de facturacion",
  "Solicitud de informacion",
  "Reclamo de desconocido",
  "Otro",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

// ── Notification event types ──
export const NOTIFICATION_EVENT_TYPES = {
  WR_RECEIVED: "wr_received",
  WR_DISPATCHED: "wr_dispatched",
  WO_COMPLETED: "wo_completed",
  INVOICE_SENT: "invoice_sent",
  TICKET_CREATED: "ticket_created",
  TICKET_STATUS_CHANGED: "ticket_status_changed",
  TICKET_MESSAGE: "ticket_message",
  MASS_ANNOUNCEMENT: "mass_announcement",
} as const;

export type NotificationEventType =
  (typeof NOTIFICATION_EVENT_TYPES)[keyof typeof NOTIFICATION_EVENT_TYPES];

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
