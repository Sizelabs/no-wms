import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CourierCreateForm } from "@/components/couriers/courier-create-form";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function NewCourierPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("couriers");
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

  if (!profile?.organization_id) redirect(`/${locale}`);

  return (
    <div className="space-y-6">
      <PageHeader title={t("new")} />
      <CourierCreateForm organizationId={profile.organization_id} />
    </div>
  );
}
