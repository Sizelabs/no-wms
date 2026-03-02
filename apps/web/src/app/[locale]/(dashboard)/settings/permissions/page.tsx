import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { RolePermissionsPanel } from "@/components/settings/role-permissions-panel";
import { getAllRolePermissions } from "@/lib/actions/permissions";
import { getUserRoleAssignments } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function PermissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const assignments = await getUserRoleAssignments(supabase, user.id);
  const isSuperAdmin = assignments.some((a) => a.role === "super_admin");

  if (!isSuperAdmin) redirect(`/${locale}/`);

  const allPermissions = await getAllRolePermissions();

  return (
    <div className="space-y-6">
      <PageHeader title="Permisos por Rol" />
      <RolePermissionsPanel initialPermissions={allPermissions} />
    </div>
  );
}
