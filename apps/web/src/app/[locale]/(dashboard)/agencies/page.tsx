import { getTranslations } from "next-intl/server";

import { AgencyList } from "@/components/agencies/agency-list";
import { PageHeader } from "@/components/layout/page-header";
import { getAgencies } from "@/lib/actions/agencies";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function AgenciesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "agencies", "read");
  const t = await getTranslations("nav");

  const { data: agencies } = await getAgencies();

  const canCreate = permissions.agencies.create;
  const canUpdate = permissions.agencies.update;

  return (
    <div className="space-y-6">
      <PageHeader title={t("agencies")} />
      <AgencyList agencies={agencies ?? []} canCreate={canCreate} canUpdate={canUpdate} />
    </div>
  );
}
