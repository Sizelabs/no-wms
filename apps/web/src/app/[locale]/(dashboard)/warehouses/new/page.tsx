import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { WarehouseCreateForm } from "@/components/warehouses/warehouse-create-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewWarehousePage({
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

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("warehouses")} — Nueva`} />
      <WarehouseCreateForm organizationId={profile.organization_id} />
    </div>
  );
}
