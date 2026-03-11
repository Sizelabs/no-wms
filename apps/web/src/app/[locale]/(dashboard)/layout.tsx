import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { RoleProvider } from "@/components/auth/role-provider";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { NotificationProvider } from "@/components/layout/notification";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getAuthContext } from "@/lib/auth/context";
import { getFilteredNavConfig, getFilteredSettingsGroups } from "@/lib/navigation";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ctx = await getAuthContext();

  if (!ctx) {
    redirect(`/${locale}/login`);
  }

  const { user, roles, primaryRole, permissions, warehouseIds, courierIds, agencyIds, supabase } = ctx;

  // These can run in parallel — they're independent of each other
  const [profile, cookieStore] = await Promise.all([
    supabase.from("profiles").select("organizations(name)").eq("id", user.id).single(),
    cookies(),
  ]);

  const navConfig = getFilteredNavConfig(permissions);
  const isSuperAdmin = roles.includes("super_admin");
  const settingsGroups = getFilteredSettingsGroups(permissions, isSuperAdmin);
  const userName =
    user.user_metadata?.full_name ??
    user.email ??
    "Usuario";
  const userRole = ROLE_LABELS[primaryRole];
  const userEmail = user.email ?? "";

  const orgs = profile.data?.organizations as unknown as { name: string } | { name: string }[] | null;
  const orgName = Array.isArray(orgs) ? (orgs[0]?.name ?? "") : (orgs?.name ?? "");

  const defaultCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:block print:h-auto print:overflow-visible">
      <NavigationProgress />
      <div className="print:hidden">
        <Sidebar
          navConfig={navConfig}
          settingsGroups={settingsGroups}
          locale={locale}
          defaultCollapsed={defaultCollapsed}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="print:hidden">
          <Topbar
            userName={String(userName)}
            userRole={userRole}
            userEmail={userEmail}
            orgName={orgName}
            locale={locale}
          />
        </div>
        <NotificationProvider>
          <RoleProvider roles={roles} warehouseIds={warehouseIds} courierIds={courierIds} agencyIds={agencyIds} permissions={permissions}>
            <main className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">{children}</main>
          </RoleProvider>
        </NotificationProvider>
      </div>
    </div>
  );
}
