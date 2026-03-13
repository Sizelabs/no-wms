import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { RoleProvider } from "@/components/auth/role-provider";
import { NotificationProvider } from "@/components/layout/notification";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getRolePermissions } from "@/lib/actions/permissions";
import { getAuthUser, getCachedRoleAssignments } from "@/lib/auth/cached";
import { getScopedAgencyIds, getScopedCourierIds, getScopedWarehouseIds } from "@/lib/auth/roles";
import { getFilteredNavConfig, getFilteredSettingsGroups, getPrimaryRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Parallelize: role assignments, profile query, and cookies are independent
  const supabase = await createClient();
  const [assignments, { data: profile }, cookieStore] = await Promise.all([
    getCachedRoleAssignments(),
    supabase
      .from("profiles")
      .select("organizations(name)")
      .eq("id", user.id)
      .single(),
    cookies(),
  ]);

  const roles = assignments.map((a) => a.role);
  const primaryRole = getPrimaryRole(roles);
  const permissions = await getRolePermissions(primaryRole);

  const warehouseIds = getScopedWarehouseIds(assignments);
  const courierIds = getScopedCourierIds(assignments);
  const agencyIds = getScopedAgencyIds(assignments);
  const navConfig = getFilteredNavConfig(permissions);
  const isSuperAdmin = roles.includes("super_admin");
  const settingsGroups = getFilteredSettingsGroups(permissions, isSuperAdmin);
  const userName =
    user.user_metadata?.full_name ??
    user.email ??
    "Usuario";
  const userRole = ROLE_LABELS[primaryRole];
  const userEmail = user.email ?? "";

  const orgs = profile?.organizations as unknown as { name: string } | { name: string }[] | null;
  let orgName = Array.isArray(orgs) ? (orgs[0]?.name ?? "") : (orgs?.name ?? "");

  // Agency users should see their agency name, not the forwarder's org name
  if (primaryRole === "agency" && agencyIds && agencyIds.length > 0) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", agencyIds[0])
      .single();
    if (agency?.name) orgName = agency.name;
  }
  const defaultCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:block print:h-auto print:overflow-visible">
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
            userName={userName}
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
