"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { usePermissions, useUserRoles } from "@/components/auth/role-provider";

interface SettingsNavItem {
  label: string; // i18n key under "settingsNav"
  href: string;
  resource?: string; // permission resource needed (read)
  superAdminOnly?: boolean;
}

interface SettingsNavGroup {
  id: string; // i18n key under "settingsNav" (e.g. "groupOrganization")
  items: SettingsNavItem[];
}

const SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    id: "groupOrganization",
    items: [
      { label: "general", href: "/settings" },
    ],
  },
  {
    id: "groupInfrastructure",
    items: [
      { label: "forwarders", href: "/settings/forwarders", resource: "forwarders" },
      { label: "warehouses", href: "/settings/warehouses", resource: "warehouses" },
      { label: "couriers", href: "/settings/couriers", resource: "couriers" },
    ],
  },
  {
    id: "groupUsers",
    items: [
      { label: "users", href: "/settings/users", resource: "users" },
      { label: "permissions", href: "/settings/permissions", superAdminOnly: true },
    ],
  },
  {
    id: "groupOperations",
    items: [
      { label: "destinations", href: "/settings/destinations", resource: "destinations" },
      { label: "modalities", href: "/settings/modalities", resource: "modalities" },
      { label: "handlingCosts", href: "/settings/handling-costs", resource: "handling_costs" },
    ],
  },
  {
    id: "groupSystem",
    items: [
      { label: "integrations", href: "/settings/integrations" },
      { label: "notifications", href: "/settings/notifications" },
      { label: "billing", href: "/settings/billing" },
    ],
  },
];

interface SettingsSidebarProps {
  locale: string;
}

export function SettingsSidebar({ locale }: SettingsSidebarProps) {
  const t = useTranslations("settingsNav");
  const pathname = usePathname();
  const roles = useUserRoles();
  const permissions = usePermissions();
  const isSuperAdmin = roles.includes("super_admin");

  const isItemVisible = (item: SettingsNavItem) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.resource && permissions) {
      const perm = permissions[item.resource as keyof typeof permissions];
      if (!perm?.read) return false;
    }
    return true;
  };

  const visibleGroups = SETTINGS_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter(isItemVisible),
    }))
    .filter((group) => group.items.length > 0);

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
