import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForwarderDetail } from "@/components/forwarders/forwarder-detail";
import { PageHeader } from "@/components/layout/page-header";
import {
  getOrganization,
  getOrganizationAgencies,
  getOrganizationCouriers,
  getOrganizationUsers,
  getOrganizationWarehouses,
} from "@/lib/actions/organizations";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ForwarderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "forwarders", "read");
  const t = await getTranslations("nav");

  const { data: forwarder } = await getOrganization(id);
  if (!forwarder) notFound();

  const [warehousesResult, couriersResult, agenciesResult, usersResult] = await Promise.all([
    getOrganizationWarehouses(id),
    getOrganizationCouriers(id),
    getOrganizationAgencies(id),
    getOrganizationUsers(id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("forwarders")} — ${forwarder.name}`} />
      <ForwarderDetail
        forwarder={forwarder}
        warehouses={warehousesResult.data ?? []}
        couriers={couriersResult.data ?? []}
        agencies={agenciesResult.data ?? []}
        users={usersResult.data ?? []}
      />
    </div>
  );
}
