import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { WarehouseCreateForm } from "@/components/warehouses/warehouse-create-form";
import { getOrganization } from "@/lib/actions/organizations";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ForwarderNewWarehousePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "warehouses", "create");
  const t = await getTranslations("nav");

  const { data: forwarder } = await getOrganization(id);
  if (!forwarder) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t("warehouses")} — Nueva`}
        description={forwarder.name}
      />
      <WarehouseCreateForm organizationId={id} />
    </div>
  );
}
