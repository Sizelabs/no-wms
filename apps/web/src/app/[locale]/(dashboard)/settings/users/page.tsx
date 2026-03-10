import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { AllUsersList } from "@/components/users/all-users-list";
import { UserList } from "@/components/users/user-list";
import { getOrganizationUsers } from "@/lib/actions/organizations";
import { getAllUsersGrouped } from "@/lib/actions/users";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { roles, permissions } = await requirePermission(locale, "users", "read");
  const t = await getTranslations("nav");
  const isSuperAdmin = roles.includes("super_admin");

  const canCreate = permissions.users.create;

  if (isSuperAdmin) {
    const { data: allUsers } = await getAllUsersGrouped();

    return (
      <div className="space-y-6">
        <PageHeader title={t("users")}>
          {canCreate && (
            <Link
              href={`/${locale}/settings/users/new`}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Invitar Usuario
            </Link>
          )}
        </PageHeader>
        <AllUsersList users={allUsers ?? []} />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect(`/${locale}/login`);

  const { data: users } = await getOrganizationUsers(
    profile.organization_id,
  );

  const filteredUsers = (users ?? []).filter((u) => {
    return !u.user_roles?.some(
      (r: { role: string }) => r.role === "super_admin",
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("users")}>
        {canCreate && (
          <Link
            href={`/${locale}/settings/users/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Invitar Usuario
          </Link>
        )}
      </PageHeader>
      <UserList users={filteredUsers} />
    </div>
  );
}
