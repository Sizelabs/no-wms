export interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  type: "number" | "boolean" | "string" | "json";
  defaultValue: unknown;
  /** Which scope levels can override this setting */
  scopes: Array<"platform" | "organization" | "warehouse" | "destination" | "agency" | "user">;
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: "dimensional_factor",
    label: "Factor dimensional",
    description: "Divisor para calcular peso volumétrico (L×W×H ÷ factor)",
    type: "number",
    defaultValue: 166,
    scopes: ["platform", "organization", "warehouse"],
  },
  {
    key: "free_storage_days",
    label: "Días de almacenaje gratis",
    description: "Días sin cargo de almacenaje después del recibo",
    type: "number",
    defaultValue: 30,
    scopes: ["platform", "organization", "warehouse", "destination", "agency"],
  },
  {
    key: "auto_abandon_days",
    label: "Días para auto-abandono",
    description: "Días tras los cuales un WR se marca como abandonado",
    type: "number",
    defaultValue: 90,
    scopes: ["platform", "organization", "warehouse"],
  },
  {
    key: "min_receipt_photos",
    label: "Fotos mínimas al recibir",
    description: "Cantidad mínima de fotos requeridas al recibir un paquete",
    type: "number",
    defaultValue: 1,
    scopes: ["platform", "organization", "warehouse"],
  },
  {
    key: "min_damage_photos",
    label: "Fotos mínimas por daño",
    description: "Cantidad mínima de fotos requeridas al reportar daño",
    type: "number",
    defaultValue: 3,
    scopes: ["platform", "organization", "warehouse"],
  },
  {
    key: "session_timeout_minutes",
    label: "Timeout de sesión (min)",
    description: "Minutos de inactividad antes de cerrar sesión",
    type: "number",
    defaultValue: 480,
    scopes: ["platform", "organization", "user"],
  },
  {
    key: "label_format",
    label: "Formato de etiqueta",
    description: "Formato de impresión de etiquetas internas",
    type: "string",
    defaultValue: "4x6",
    scopes: ["platform", "organization", "warehouse"],
  },
  {
    key: "hawb_number_format",
    label: "Formato número HAWB",
    description: "Patrón de numeración para HAWB (ej: GLP{seq})",
    type: "string",
    defaultValue: "GLP{seq}",
    scopes: ["platform", "organization"],
  },
  {
    key: "dispatch_approval_required",
    label: "Aprobación de despacho requerida",
    description: "Requiere aprobación del admin antes de despachar",
    type: "boolean",
    defaultValue: false,
    scopes: ["platform", "organization", "agency"],
  },
  {
    key: "wr_entry_sla_hours",
    label: "SLA de ingreso de WR (horas)",
    description: "Horas máximas entre recepción física e ingreso al sistema",
    type: "number",
    defaultValue: 4,
    scopes: ["platform", "organization", "warehouse"],
  },
  {
    key: "dgr_checklist",
    label: "Checklist DGR",
    description: "Items del checklist de mercancía peligrosa",
    type: "json",
    defaultValue: [
      "Baterías de litio",
      "Líquidos inflamables",
      "Gases comprimidos",
      "Materiales corrosivos",
      "Explosivos",
    ],
    scopes: ["platform", "organization", "warehouse"],
  },
  {
    key: "enabled_work_order_types",
    label: "Tipos de OT habilitados",
    description: "Tipos de órdenes de trabajo activos para esta configuración",
    type: "json",
    defaultValue: [
      "abandon",
      "group",
      "authorize_pickup",
      "consolidate",
      "delivery",
      "divide",
      "ship",
      "photos",
      "inspection",
      "inventory_count",
      "repack",
      "return",
      "special_request",
    ],
    scopes: ["platform", "organization", "warehouse"],
  },
];

export const SCOPE_LABELS: Record<string, string> = {
  platform: "Plataforma",
  organization: "Organización",
  warehouse: "Bodega",
  destination: "Destino",
  agency: "Agencia",
  user: "Usuario",
};

export const SCOPE_ORDER = [
  "platform",
  "organization",
  "warehouse",
  "destination",
  "agency",
  "user",
] as const;

export type SettingScope = (typeof SCOPE_ORDER)[number];
