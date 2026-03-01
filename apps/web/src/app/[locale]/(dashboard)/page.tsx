import type { Role } from "@no-wms/shared/constants/roles";
import { redirect } from "next/navigation";

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

  const roles = (user.app_metadata?.roles as Role[] | undefined) ?? ["agency" as Role];
  const primaryRole = getPrimaryRole(roles);

  return <DashboardGrid role={primaryRole} />;
}
