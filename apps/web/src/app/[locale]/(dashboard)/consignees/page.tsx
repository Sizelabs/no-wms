import { getTranslations } from "next-intl/server";

import { ConsigneeList } from "@/components/consignees/consignee-list";
import { PageHeader } from "@/components/layout/page-header";
import { getConsignees } from "@/lib/actions/consignees";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ConsigneesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "consignees", "read");
  const t = await getTranslations("nav");

  const { data: consignees } = await getConsignees();

  const canCreate = permissions.consignees.create;
  const canUpdate = permissions.consignees.update;

  return (
    <div className="space-y-6">
      <PageHeader title={t("consignees")} />
      <ConsigneeList consignees={consignees ?? []} canCreate={canCreate} canUpdate={canUpdate} />
    </div>
  );
}
