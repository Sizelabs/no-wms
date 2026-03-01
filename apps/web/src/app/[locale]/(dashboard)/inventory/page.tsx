import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { InventoryTable } from "@/components/warehouse/inventory-table";
import { getWarehouseReceipts } from "@/lib/actions/warehouse-receipts";

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; status?: string; offset?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const t = await getTranslations("nav");

  const { data, count } = await getWarehouseReceipts({
    search: filters.search,
    status: filters.status,
    offset: filters.offset ? parseInt(filters.offset, 10) : 0,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("inventory")} />
      <InventoryTable
        data={data ?? []}
        count={count}
        locale={locale}
      />
    </div>
  );
}
