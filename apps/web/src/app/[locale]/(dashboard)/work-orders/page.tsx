import Link from "next/link";
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
      <PageHeader title={t("workOrders")}>
        {canCreate && (
          <Link
            href="work-orders/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva OT
          </Link>
        )}
      </PageHeader>
      <WoList data={data ?? []} locale={locale} canUpdate={permissions.work_orders.update} />
    </div>
  );
}
