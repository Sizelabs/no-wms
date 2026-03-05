"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Contact,
  DollarSign,
  FileText,
  HelpCircle,
  History,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  TicketCheck,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NavConfig, NavItem } from "@/lib/navigation";

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Contact,
  DollarSign,
  FileText,
  HelpCircle,
  History,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  TicketCheck,
  Truck,
};

interface SidebarProps {
  navConfig: NavConfig;
  locale: string;
  defaultCollapsed: boolean;
}

function setCollapsedCookie(collapsed: boolean) {
  document.cookie = `sidebar-collapsed=${collapsed};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

export function Sidebar({ navConfig, locale, defaultCollapsed }: SidebarProps) {
  const t = useTranslations("nav");
  const tGroups = useTranslations("navGroups");
  const pathname = usePathname();
  const inSettings = pathname.startsWith(`/${locale}/settings`);
  const [collapsed, setCollapsed] = useState(inSettings || defaultCollapsed);
  const prevInSettings = useRef(inSettings);

  // Auto-collapse when entering settings, restore when leaving
  useEffect(() => {
    if (inSettings && !prevInSettings.current) {
      setCollapsed(true);
    } else if (!inSettings && prevInSettings.current) {
      // Restore the persisted preference when leaving settings
      const cookie = document.cookie.split("; ").find((c) => c.startsWith("sidebar-collapsed="));
      const persisted = cookie?.split("=")[1] === "true";
      setCollapsed(persisted);
    }
    prevInSettings.current = inSettings;
  }, [inSettings]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      // Only persist the manual toggle when not auto-collapsed by settings
      if (!pathname.startsWith(`/${locale}/settings`)) {
        setCollapsedCookie(next);
      }
      return next;
    });
  }, [locale, pathname]);

  const isActive = (item: NavItem) => {
    if (item.href === "/") {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname.startsWith(`/${locale}${item.href}`);
  };

  return (
    <Tooltip.Provider delayDuration={0}>
      <aside
        className={`flex h-full flex-col border-r bg-white transition-[width] duration-200 ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        {/* Header */}
        <div className={`flex h-14 items-center border-b ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          {!collapsed && (
            <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">
              no-wms
            </Link>
          )}
          <button
            type="button"
            onClick={toggle}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navConfig.groups.map((group, groupIdx) => (
            <div key={group.id} className={groupIdx > 0 ? "mt-4" : ""}>
              {/* Group label */}
              {collapsed ? (
                groupIdx > 0 && <div className="mx-2 mb-2 border-t" />
              ) : (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {tGroups(group.id)}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    locale={locale}
                    active={isActive(item)}
                    collapsed={collapsed}
                    label={t(item.label)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t px-2 py-2">
          {/* Bottom nav items (Settings) */}
          <ul className="mb-2 space-y-0.5">
            {navConfig.bottomItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                locale={locale}
                active={isActive(item)}
                collapsed={collapsed}
                label={t(item.label)}
              />
            ))}
          </ul>
        </div>
      </aside>
    </Tooltip.Provider>
  );
}

function NavLink({
  item,
  locale,
  active,
  collapsed,
  label,
}: {
  item: NavItem;
  locale: string;
  active: boolean;
  collapsed: boolean;
  label: string;
}) {
  const Icon = ICON_MAP[item.icon];
  const fullHref = `/${locale}${item.href === "/" ? "" : item.href}`;

  const linkContent = (
    <Link
      href={fullHref}
      className={`flex items-center rounded-md text-sm font-medium transition-colors ${
        collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
      } ${
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{linkContent}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={8}
              className="z-50 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95"
            >
              {label}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </li>
    );
  }

  return <li>{linkContent}</li>;
}
