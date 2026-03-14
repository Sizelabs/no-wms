import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { WoList } from "@/components/work-orders/wo-list";
import { getWorkOrders } from "@/lib/actions/work-orders";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function WorkOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "work_orders", "read");
  const t = await getTranslations("nav");
  const { data } = await getWorkOrders();

  const canCreate = permissions.work_orders.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("workOrders")} />
      <WoList data={data ?? []} locale={locale} canUpdate={permissions.work_orders.update} canCreate={canCreate} />
    </div>
  );
}
