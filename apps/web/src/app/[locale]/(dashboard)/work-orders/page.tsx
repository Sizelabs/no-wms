import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { WoList } from "@/components/work-orders/wo-list";
import { getWorkOrders } from "@/lib/actions/work-orders";
import { requirePermission } from "@/lib/auth/require-permission";

async function WoHeader({ locale }: { locale: string }) {
  const { permissions } = await requirePermission(locale, "work_orders", "read");
  const t = await getTranslations("nav");
  const canCreate = permissions.work_orders.create;

  return (
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
  );
}

async function WoTableSection({ locale }: { locale: string }) {
  await requirePermission(locale, "work_orders", "read");
  const { data } = await getWorkOrders();
  return <WoList data={data ?? []} locale={locale} />;
}

export default async function WorkOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageHeaderSkeleton hasButtons />}>
        <WoHeader locale={locale} />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <WoTableSection locale={locale} />
      </Suspense>
    </div>
  );
}
