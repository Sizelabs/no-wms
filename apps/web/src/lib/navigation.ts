import type { RolePermissionMap } from "@no-wms/shared/constants/permissions";
import type { Role } from "@no-wms/shared/constants/roles";

export interface NavItem {
  label: string; // i18n key under "nav"
  href: string;
  icon: string; // Lucide icon name
  resource?: string; // permission resource key (if absent, always visible)
}

export interface NavGroup {
  id: string; // i18n key under "navGroups"
  items: NavItem[];
}

export interface NavConfig {
  groups: NavGroup[];
  bottomItems: NavItem[];
}

/** Full nav config with all items grouped */
const NAV_CONFIG: NavConfig = {
  groups: [
    {
      id: "overview",
      items: [
        { label: "dashboard", href: "/", icon: "LayoutDashboard" },
      ],
    },
    {
      id: "warehouse",
      items: [
        { label: "warehouseReceipts", href: "/warehouse-receipts", icon: "Package", resource: "warehouse_receipts" },
        { label: "unknownWrs", href: "/unknown-wrs", icon: "PackageSearch", resource: "unknown_wrs" },
        { label: "inventory", href: "/inventory", icon: "Boxes", resource: "inventory" },
        { label: "history", href: "/history", icon: "History", resource: "history" },
      ],
    },
    {
      id: "fulfillment",
      items: [
        { label: "workOrders", href: "/work-orders", icon: "ClipboardList", resource: "work_orders" },
        { label: "shipping", href: "/shipping", icon: "Truck", resource: "shipping" },
        { label: "manifests", href: "/manifests", icon: "FileText", resource: "manifests" },
      ],
    },
    {
      id: "clients",
      items: [
        { label: "agencies", href: "/agencies", icon: "Building2", resource: "agencies" },
        { label: "consignees", href: "/consignees", icon: "Contact", resource: "consignees" },
      ],
    },
    {
      id: "finance",
      items: [
        { label: "tariffs", href: "/tariffs", icon: "DollarSign", resource: "tariffs" },
        { label: "invoicing", href: "/invoicing", icon: "Receipt", resource: "invoicing" },
      ],
    },
    {
      id: "reports",
      items: [
        { label: "reports", href: "/reports", icon: "BarChart3", resource: "reports" },
      ],
    },
  ],
  bottomItems: [
    { label: "tickets", href: "/tickets", icon: "TicketCheck", resource: "tickets" },
    { label: "settings", href: "/settings", icon: "Settings", resource: "settings" },
  ],
};

/**
 * Derive visible nav config from effective permissions.
 * Filters items by `read` permission, removes empty groups.
 * Dashboard (no resource) is always shown.
 */
export function getFilteredNavConfig(perms: RolePermissionMap): NavConfig {
  const filterItem = (item: NavItem): boolean => {
    if (!item.resource) return true;
    const resource = item.resource as keyof RolePermissionMap;
    return perms[resource]?.read === true;
  };

  const groups = NAV_CONFIG.groups
    .map((group) => ({
      ...group,
      items: group.items.filter(filterItem),
    }))
    .filter((group) => group.items.length > 0);

  const bottomItems = NAV_CONFIG.bottomItems.filter(filterItem);

  return { groups, bottomItems };
}

/* ------------------------------------------------------------------ */
/*  Settings sub-navigation                                           */
/* ------------------------------------------------------------------ */

export interface SettingsNavItem {
  label: string; // i18n key under "settingsNav"
  href: string;
  resource?: string; // permission resource needed (read)
  superAdminOnly?: boolean;
}

export interface SettingsNavGroup {
  id: string; // i18n key under "settingsNav" (e.g. "groupOrganization")
  items: SettingsNavItem[];
}

export const SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    id: "groupOrganization",
    items: [
      { label: "general", href: "/settings" },
    ],
  },
  {
    id: "groupNetwork",
    items: [
      { label: "forwarders", href: "/settings/forwarders", resource: "forwarders" },
      { label: "warehouses", href: "/settings/warehouses", resource: "warehouses" },
      { label: "couriers", href: "/settings/couriers", resource: "couriers" },
      { label: "locations", href: "/settings/locations", resource: "locations" },
    ],
  },
  {
    id: "groupAccess",
    items: [
      { label: "users", href: "/settings/users", resource: "users" },
      { label: "permissions", href: "/settings/permissions", superAdminOnly: true },
    ],
  },
  {
    id: "groupCatalog",
    items: [
      { label: "destinations", href: "/settings/destinations", resource: "destinations" },
      { label: "modalities", href: "/settings/modalities", resource: "modalities" },
      { label: "handlingCosts", href: "/settings/handling-costs", resource: "handling_costs" },
    ],
  },
  {
    id: "groupPlatform",
    items: [
      { label: "integrations", href: "/settings/integrations" },
      { label: "notifications", href: "/settings/notifications" },
      { label: "billing", href: "/settings/billing" },
    ],
  },
];

/**
 * Filter settings groups by permissions + super_admin flag.
 * Used by both the sidebar flyout (server-side) and the settings sidebar (client-side).
 */
export function getFilteredSettingsGroups(
  perms: RolePermissionMap,
  isSuperAdmin: boolean,
): SettingsNavGroup[] {
  return SETTINGS_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.superAdminOnly && !isSuperAdmin) return false;
        if (item.resource) {
          const perm = perms[item.resource as keyof RolePermissionMap];
          if (!perm?.read) return false;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

// Keep old function for backwards compat during migration (used by require-permission.ts)
export function getNavForPermissions(perms: RolePermissionMap): NavItem[] {
  const config = getFilteredNavConfig(perms);
  return [...config.groups.flatMap((g) => g.items), ...config.bottomItems];
}

/** Get the primary (highest-privilege) role for a user with multiple roles */
const ROLE_PRIORITY: Role[] = [
  "super_admin",
  "forwarder_admin",
  "warehouse_admin",
  "destination_admin",
  "shipping_clerk",
  "warehouse_operator",
  "destination_operator",
  "agency",
];

export function getPrimaryRole(roles: Role[]): Role {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return "agency";
}
