import type { RolePermissionMap } from "@no-wms/shared/constants/permissions";
import { NAV_RESOURCE_MAP } from "@no-wms/shared/constants/permissions";
import type { Role } from "@no-wms/shared/constants/roles";

export interface NavItem {
  label: string; // i18n key under "nav"
  href: string;
  icon: string; // Lucide icon name for future use
}

/** All possible nav items in display order. Dashboard is always visible. */
const ALL_NAV_ITEMS: NavItem[] = [
  { label: "dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "forwarders", href: "/forwarders", icon: "Building" },
  { label: "warehouses", href: "/warehouses", icon: "Warehouse" },
  { label: "couriers", href: "/couriers", icon: "PackageCheck" },
  { label: "agencies", href: "/agencies", icon: "Building2" },
  { label: "consignees", href: "/consignees", icon: "Contact" },
  { label: "warehouseReceipts", href: "/warehouse-receipts", icon: "Package" },
  { label: "inventory", href: "/inventory", icon: "Boxes" },
  { label: "history", href: "/history", icon: "History" },
  { label: "workOrders", href: "/work-orders", icon: "ClipboardList" },
  { label: "shipping", href: "/shipping", icon: "Truck" },
  { label: "manifests", href: "/manifests", icon: "FileText" },
  { label: "tariffs", href: "/tariffs", icon: "DollarSign" },
  { label: "invoicing", href: "/invoicing", icon: "Receipt" },
  { label: "tickets", href: "/tickets", icon: "TicketCheck" },
  { label: "reports", href: "/reports", icon: "BarChart3" },
  { label: "unknownWrs", href: "/unknown-wrs", icon: "HelpCircle" },
  { label: "users", href: "/users", icon: "Users" },
  { label: "settings", href: "/settings", icon: "Settings" },
];

/**
 * Derive visible nav items from effective permissions.
 * A nav item is shown if the role has `read` on its mapped resource.
 * Dashboard (no resource mapping) is always shown.
 */
export function getNavForPermissions(perms: RolePermissionMap): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => {
    const resource = NAV_RESOURCE_MAP[item.label];
    // Items without a resource mapping (dashboard) are always visible
    if (!resource) return true;
    return perms[resource].read;
  });
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
