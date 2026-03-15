import { redirect } from "next/navigation";

import { DashboardGrid } from "@/components/layout/dashboard-grid";
import { getDashboardStats } from "@/lib/actions/reports";
import { getAuthUser, getCachedRoleAssignments } from "@/lib/auth/cached";
import { getPrimaryRole } from "@/lib/navigation";

export default async function DashboardPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/es/login");
  }

  // Role assignments are cached from the layout — no extra DB call
  const assignments = await getCachedRoleAssignments();
  const roles = assignments.map((a) => a.role);
  const primaryRole = getPrimaryRole(roles);
  const stats = await getDashboardStats();

  return <DashboardGrid role={primaryRole} stats={stats as never} />;
}
