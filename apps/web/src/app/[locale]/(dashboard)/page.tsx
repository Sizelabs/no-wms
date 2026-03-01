import { redirect } from "next/navigation";

import { getUserRoles } from "@/lib/auth/roles";
import { DashboardGrid } from "@/components/layout/dashboard-grid";
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

  return <DashboardGrid role={primaryRole} />;
}
