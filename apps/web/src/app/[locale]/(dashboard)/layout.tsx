import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { RoleProvider } from "@/components/auth/role-provider";
import { NotificationProvider } from "@/components/layout/notification";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getRolePermissions } from "@/lib/actions/permissions";
import { getScopedAgencyIds, getScopedCourierIds, getScopedWarehouseIds, getUserRoleAssignments } from "@/lib/auth/roles";
import { getFilteredNavConfig, getPrimaryRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const assignments = await getUserRoleAssignments(supabase, user.id);
  const roles = assignments.map((a) => a.role);
  const warehouseIds = getScopedWarehouseIds(assignments);
  const courierIds = getScopedCourierIds(assignments);
  const agencyIds = getScopedAgencyIds(assignments);
  const primaryRole = getPrimaryRole(roles);
  const permissions = await getRolePermissions(primaryRole);
  const navConfig = getFilteredNavConfig(permissions);
  const userName =
    user.user_metadata?.full_name ??
    user.email ??
    "Usuario";
  const userRole = ROLE_LABELS[primaryRole];
  const userEmail = user.email ?? "";

  // Fetch the user's organization name
  const { data: profile } = await supabase
    .from("profiles")
    .select("organizations(name)")
    .eq("id", user.id)
    .single();
  const orgs = profile?.organizations as unknown as { name: string } | { name: string }[] | null;
  const orgName = Array.isArray(orgs) ? (orgs[0]?.name ?? "") : (orgs?.name ?? "");

  // Read sidebar collapse cookie for SSR (avoid layout shift)
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        navConfig={navConfig}
        locale={locale}
        defaultCollapsed={defaultCollapsed}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={userName}
          userRole={userRole}
          userEmail={userEmail}
          orgName={orgName}
          locale={locale}
        />
        <NotificationProvider>
          <RoleProvider roles={roles} warehouseIds={warehouseIds} courierIds={courierIds} agencyIds={agencyIds} permissions={permissions}>
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </RoleProvider>
        </NotificationProvider>
      </div>
    </div>
  );
}
