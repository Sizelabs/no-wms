import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { InviteUserForm } from "@/components/users/invite-user-form";
import { getOrganization } from "@/lib/actions/organizations";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyInviteUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("nav");
  const supabase = await createClient();

  const { data: company } = await getOrganization(id);
  if (!company) notFound();

  const [warehousesResult, courriersResult, agenciesResult] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("courriers")
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
      <PageHeader
        title={`${t("users")} — Invitar`}
        description={company.name}
      />
      <InviteUserForm
        organizationId={id}
        warehouses={warehousesResult.data ?? []}
        courriers={courriersResult.data ?? []}
        agencies={agenciesResult.data ?? []}
      />
    </div>
  );
}
