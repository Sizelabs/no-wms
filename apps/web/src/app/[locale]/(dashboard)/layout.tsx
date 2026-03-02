import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { RoleProvider } from "@/components/auth/role-provider";
import { NotificationProvider } from "@/components/layout/notification";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getScopedWarehouseIds, getUserRoleAssignments } from "@/lib/auth/roles";
import { getNavForRole, getPrimaryRole } from "@/lib/navigation";
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
  const primaryRole = getPrimaryRole(roles);
  const navItems = getNavForRole(primaryRole);
  const userName =
    user.user_metadata?.full_name ??
    user.email ??
    "Usuario";
  const userRole = ROLE_LABELS[primaryRole];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar items={navItems} locale={locale} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userName={userName} userRole={userRole} />
        <NotificationProvider>
          <RoleProvider roles={roles} warehouseIds={warehouseIds}>
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </RoleProvider>
        </NotificationProvider>
      </div>
    </div>
  );
}
