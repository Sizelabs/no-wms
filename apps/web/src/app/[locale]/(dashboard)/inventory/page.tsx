import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { InventoryTable } from "@/components/warehouse/inventory-table";
import { getAgenciesForFilter, getWarehouseReceipts, getWarehousesForFilter } from "@/lib/actions/warehouse-receipts";

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    agency_id?: string;
    warehouse_id?: string;
    carrier?: string;
    is_damaged?: string;
    date_from?: string;
    date_to?: string;
    offset?: string;
  }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const t = await getTranslations("nav");

  const [{ data, count }, agencies, warehouses] = await Promise.all([
    getWarehouseReceipts({
      search: filters.search,
      status: filters.status,
      agency_id: filters.agency_id,
      warehouse_id: filters.warehouse_id,
      carrier: filters.carrier,
      is_damaged: filters.is_damaged,
      date_from: filters.date_from,
      date_to: filters.date_to,
      offset: filters.offset ? parseInt(filters.offset, 10) : 0,
    }),
    getAgenciesForFilter(),
    getWarehousesForFilter(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("inventory")} />
      <InventoryTable
        data={data ?? []}
        count={count}
        locale={locale}
        agencies={agencies}
        warehouses={warehouses}
      />
    </div>
  );
}
