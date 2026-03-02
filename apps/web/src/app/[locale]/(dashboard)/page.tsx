import { redirect } from "next/navigation";

import { DashboardGrid } from "@/components/layout/dashboard-grid";
import { getDashboardStats } from "@/lib/actions/reports";
import { getUserRoles } from "@/lib/auth/roles";
import { getPrimaryRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/es/login");
  }

  const roles = await getUserRoles(supabase, user.id);
  const primaryRole = getPrimaryRole(roles);
  const stats = await getDashboardStats();

  return <DashboardGrid role={primaryRole} stats={stats as never} />;
}
