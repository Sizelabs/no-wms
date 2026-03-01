import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { WoList } from "@/components/work-orders/wo-list";
import { getWorkOrders } from "@/lib/actions/work-orders";

export default async function WorkOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("nav");
  const { data } = await getWorkOrders();

  return (
    <div className="space-y-6">
      <PageHeader title={t("workOrders")}>
        <Link
          href="work-orders/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nueva OT
        </Link>
      </PageHeader>
      <WoList data={data ?? []} locale={locale} />
    </div>
  );
}
