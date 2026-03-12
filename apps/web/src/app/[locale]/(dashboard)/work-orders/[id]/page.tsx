import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WoDetail } from "@/components/work-orders/wo-detail";
import { getWorkOrder } from "@/lib/actions/work-orders";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { permissions } = await requirePermission(locale, "work_orders", "read");
  const { data: wo, error } = await getWorkOrder(id);

  if (error || !wo) {
    notFound();
  }

  const canUpdate = permissions.work_orders.update;

  return (
    <div className="space-y-6">
      <PageHeader title={`Orden de Trabajo ${wo.wo_number}`} />
      <WoDetail wo={wo} locale={locale} canUpdate={canUpdate} />
    </div>
  );
}
