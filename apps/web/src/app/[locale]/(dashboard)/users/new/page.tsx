import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { InviteUserForm } from "@/components/users/invite-user-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewUserPage({
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

  const [warehousesResult, agenciesResult] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("agencies")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("users")} — Invitar`} />
      <InviteUserForm
        organizationId={profile.organization_id}
        warehouses={warehousesResult.data ?? []}
        agencies={agenciesResult.data ?? []}
      />
    </div>
  );
}
