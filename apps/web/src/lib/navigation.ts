import type { Role } from "@no-wms/shared/constants/roles";

export interface NavItem {
  label: string; // i18n key under "nav"
  href: string;
  icon: string; // Lucide icon name for future use
}

/** Navigation items visible per role */
const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  super_admin: [
    { label: "dashboard", href: "/", icon: "LayoutDashboard" },
    { label: "agencies", href: "/agencies", icon: "Building2" },
    { label: "warehouseReceipts", href: "/warehouse-receipts", icon: "Package" },
    { label: "inventory", href: "/inventory", icon: "Warehouse" },
    { label: "workOrders", href: "/work-orders", icon: "ClipboardList" },
    { label: "shipping", href: "/shipping", icon: "Truck" },
    { label: "manifests", href: "/manifests", icon: "FileText" },
    { label: "tariffs", href: "/tariffs", icon: "DollarSign" },
    { label: "invoicing", href: "/invoicing", icon: "Receipt" },
    { label: "tickets", href: "/tickets", icon: "TicketCheck" },
    { label: "reports", href: "/reports", icon: "BarChart3" },
    { label: "unknownWrs", href: "/unknown-wrs", icon: "HelpCircle" },
    { label: "settings", href: "/settings", icon: "Settings" },
  ],
  warehouse_admin: [
    { label: "dashboard", href: "/", icon: "LayoutDashboard" },
    { label: "agencies", href: "/agencies", icon: "Building2" },
    { label: "warehouseReceipts", href: "/warehouse-receipts", icon: "Package" },
    { label: "inventory", href: "/inventory", icon: "Warehouse" },
    { label: "workOrders", href: "/work-orders", icon: "ClipboardList" },
    { label: "shipping", href: "/shipping", icon: "Truck" },
    { label: "manifests", href: "/manifests", icon: "FileText" },
    { label: "tickets", href: "/tickets", icon: "TicketCheck" },
    { label: "reports", href: "/reports", icon: "BarChart3" },
    { label: "unknownWrs", href: "/unknown-wrs", icon: "HelpCircle" },
    { label: "settings", href: "/settings", icon: "Settings" },
  ],
  warehouse_operator: [
    { label: "dashboard", href: "/", icon: "LayoutDashboard" },
    { label: "warehouseReceipts", href: "/warehouse-receipts", icon: "Package" },
    { label: "inventory", href: "/inventory", icon: "Warehouse" },
    { label: "workOrders", href: "/work-orders", icon: "ClipboardList" },
    { label: "shipping", href: "/shipping", icon: "Truck" },
    { label: "manifests", href: "/manifests", icon: "FileText" },
    { label: "tickets", href: "/tickets", icon: "TicketCheck" },
    { label: "unknownWrs", href: "/unknown-wrs", icon: "HelpCircle" },
  ],
  shipping_clerk: [
    { label: "dashboard", href: "/", icon: "LayoutDashboard" },
    { label: "inventory", href: "/inventory", icon: "Warehouse" },
    { label: "shipping", href: "/shipping", icon: "Truck" },
    { label: "manifests", href: "/manifests", icon: "FileText" },
    { label: "tickets", href: "/tickets", icon: "TicketCheck" },
    { label: "reports", href: "/reports", icon: "BarChart3" },
  ],
  destination_admin: [
    { label: "dashboard", href: "/", icon: "LayoutDashboard" },
    { label: "agencies", href: "/agencies", icon: "Building2" },
    { label: "inventory", href: "/inventory", icon: "Warehouse" },
    { label: "workOrders", href: "/work-orders", icon: "ClipboardList" },
    { label: "shipping", href: "/shipping", icon: "Truck" },
    { label: "manifests", href: "/manifests", icon: "FileText" },
    { label: "tariffs", href: "/tariffs", icon: "DollarSign" },
    { label: "invoicing", href: "/invoicing", icon: "Receipt" },
    { label: "tickets", href: "/tickets", icon: "TicketCheck" },
    { label: "reports", href: "/reports", icon: "BarChart3" },
    { label: "unknownWrs", href: "/unknown-wrs", icon: "HelpCircle" },
    { label: "settings", href: "/settings", icon: "Settings" },
  ],
  destination_operator: [
    { label: "dashboard", href: "/", icon: "LayoutDashboard" },
    { label: "agencies", href: "/agencies", icon: "Building2" },
    { label: "inventory", href: "/inventory", icon: "Warehouse" },
    { label: "workOrders", href: "/work-orders", icon: "ClipboardList" },
    { label: "shipping", href: "/shipping", icon: "Truck" },
    { label: "manifests", href: "/manifests", icon: "FileText" },
    { label: "tickets", href: "/tickets", icon: "TicketCheck" },
    { label: "reports", href: "/reports", icon: "BarChart3" },
    { label: "unknownWrs", href: "/unknown-wrs", icon: "HelpCircle" },
  ],
  agency: [
    { label: "dashboard", href: "/", icon: "LayoutDashboard" },
    { label: "inventory", href: "/inventory", icon: "Warehouse" },
    { label: "workOrders", href: "/work-orders", icon: "ClipboardList" },
    { label: "shipping", href: "/shipping", icon: "Truck" },
    { label: "manifests", href: "/manifests", icon: "FileText" },
    { label: "invoicing", href: "/invoicing", icon: "Receipt" },
    { label: "tickets", href: "/tickets", icon: "TicketCheck" },
    { label: "unknownWrs", href: "/unknown-wrs", icon: "HelpCircle" },
  ],
};

export function getNavForRole(role: Role): NavItem[] {
  return NAV_BY_ROLE[role] ?? NAV_BY_ROLE.agency;
}

/** Get the primary (highest-privilege) role for a user with multiple roles */
const ROLE_PRIORITY: Role[] = [
  "super_admin",
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
