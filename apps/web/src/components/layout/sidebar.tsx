"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import type { NavItem } from "@/lib/navigation";

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

            return (
              <li key={item.href}>
                <Link
                  href={fullHref}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {t(item.label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
