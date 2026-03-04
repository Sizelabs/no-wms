"use client";

import {
  BarChart3,
  Boxes,
  Building,
  Building2,
  ClipboardList,
  Contact,
  DollarSign,
  FileText,
  HelpCircle,
  History,
  LayoutDashboard,
  Package,
  PackageCheck,
  Receipt,
  Settings,
  TicketCheck,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import type { NavItem } from "@/lib/navigation";

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Boxes,
  Building,
  Building2,
  ClipboardList,
  Contact,
  DollarSign,
  FileText,
  HelpCircle,
  History,
  LayoutDashboard,
  Package,
  PackageCheck,
  Receipt,
  Settings,
  TicketCheck,
  Truck,
  Users,
  Warehouse,
};

interface SidebarProps {
  items: NavItem[];
  locale: string;
}

export function Sidebar({ items, locale }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">
          no-wms
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const fullHref = `/${locale}${item.href === "/" ? "" : item.href}`;
            const isActive =
              item.href === "/"
                ? pathname === `/${locale}` || pathname === `/${locale}/`
                : pathname.startsWith(`/${locale}${item.href}`);
            const Icon = ICON_MAP[item.icon];

            return (
              <li key={item.href}>
                <Link
                  href={fullHref}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {Icon && <Icon className="size-4 shrink-0" />}
                  {t(item.label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Version */}
      <div className="border-t px-4 py-3">
        <span className="text-xs font-mono text-gray-400">v0.1.0</span>
      </div>
    </aside>
  );
}
