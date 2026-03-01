import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";

import { getUserRoles } from "@/lib/auth/roles";
import { PageHeader } from "@/components/layout/page-header";
import { UnknownWrList } from "@/components/warehouse/unknown-wr-list";
import { getUnknownWrs } from "@/lib/actions/unknown-wrs";
import { getPrimaryRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function UnknownWrsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = useTranslations("nav");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const roles = await getUserRoles(supabase, user.id);
  const primaryRole = getPrimaryRole(roles);
  const isAgencyRole = primaryRole === "agency";

  const { data } = await getUnknownWrs({ status: "unclaimed" });

  return (
    <div className="space-y-6">
      <PageHeader title={t("unknownWrs")} />
      <UnknownWrList data={data ?? []} isAgencyRole={isAgencyRole} />
    </div>
  );
}
