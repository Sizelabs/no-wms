import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { InviteUserForm } from "@/components/users/invite-user-form";
import { getOrganization } from "@/lib/actions/organizations";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export default async function ForwarderInviteUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "users", "create");
  const t = await getTranslations("nav");
  const supabase = await createClient();

  const { data: forwarder } = await getOrganization(id);
  if (!forwarder) notFound();

  const [warehousesResult, couriersResult, agenciesResult] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("couriers")
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
        description={forwarder.name}
      />
      <InviteUserForm
        organizationId={id}
        warehouses={warehousesResult.data ?? []}
        couriers={couriersResult.data ?? []}
        agencies={agenciesResult.data ?? []}
      />
    </div>
  );
}
