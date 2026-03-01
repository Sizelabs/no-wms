import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { UserList } from "@/components/users/user-list";
import { getOrganizationUsers } from "@/lib/actions/organizations";
import { createClient } from "@/lib/supabase/server";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("nav");
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

  return (
    <div className="space-y-6">
      <PageHeader title={t("users")}>
        <Link
          href={`/${locale}/users/new`}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Invitar Usuario
        </Link>
      </PageHeader>
      <UserList users={users ?? []} />
    </div>
  );
}
