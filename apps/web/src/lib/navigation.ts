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
      id: "operations",
      items: [
        { label: "dashboard", href: "/", icon: "LayoutDashboard" },
        { label: "warehouseReceipts", href: "/warehouse-receipts", icon: "Package", resource: "warehouse_receipts" },
        { label: "inventory", href: "/inventory", icon: "Boxes", resource: "inventory" },
        { label: "workOrders", href: "/work-orders", icon: "ClipboardList", resource: "work_orders" },
        { label: "shipping", href: "/shipping", icon: "Truck", resource: "shipping" },
        { label: "manifests", href: "/manifests", icon: "FileText", resource: "manifests" },
        { label: "history", href: "/history", icon: "History", resource: "history" },
      ],
    },
    {
      id: "commercial",
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
        { label: "unknownWrs", href: "/unknown-wrs", icon: "HelpCircle", resource: "unknown_wrs" },
        { label: "tickets", href: "/tickets", icon: "TicketCheck", resource: "tickets" },
      ],
    },
  ],
  bottomItems: [
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
