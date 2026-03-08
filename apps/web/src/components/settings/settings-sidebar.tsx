"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { usePermissions, useUserRoles } from "@/components/auth/role-provider";
import { getFilteredSettingsGroups } from "@/lib/navigation";

interface SettingsSidebarProps {
  locale: string;
}

export function SettingsSidebar({ locale }: SettingsSidebarProps) {
  const t = useTranslations("settingsNav");
  const pathname = usePathname();
  const roles = useUserRoles();
  const permissions = usePermissions();
  const isSuperAdmin = roles.includes("super_admin");

  const visibleGroups = permissions
    ? getFilteredSettingsGroups(permissions, isSuperAdmin)
    : [];

  return (
    <nav className="w-48 shrink-0">
      {/* Header with back arrow */}
      <Link
        href={`/${locale}`}
        className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" />
        <span className="text-sm font-semibold text-gray-900">{t("title")}</span>
      </Link>

      {/* Grouped items */}
      {visibleGroups.map((group, groupIdx) => (
        <div key={group.id} className={groupIdx > 0 ? "mt-4" : ""}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {t(group.id)}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const fullHref = `/${locale}${item.href}`;
              const isActive =
                item.href === "/settings"
                  ? pathname === `/${locale}/settings` || pathname === `/${locale}/settings/`
                  : pathname.startsWith(`/${locale}${item.href}`);

              return (
                <li key={item.href}>
                  <Link
                    href={fullHref}
                    className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "bg-gray-100 font-medium text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {t(item.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
