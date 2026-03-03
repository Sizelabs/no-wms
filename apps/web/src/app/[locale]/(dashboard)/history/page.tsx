import { getTranslations } from "next-intl/server";

import { HistoryTabs } from "@/components/history/history-tabs";
import { PageHeader } from "@/components/layout/page-header";
import {
  getAgenciesForFilter,
  getPackages,
  getWarehouseReceiptsForHistory,
  getWarehousesForFilter,
} from "@/lib/actions/warehouse-receipts";

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    tab?: string;
    search?: string;
    status?: string;
    agency_id?: string;
    warehouse_id?: string;
    date_from?: string;
    date_to?: string;
    offset?: string;
  }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const t = await getTranslations("history");

  const offset = filters.offset ? parseInt(filters.offset, 10) : 0;

  const [wrResult, pkgResult, agencies, warehouses] = await Promise.all([
    getWarehouseReceiptsForHistory({
      search: filters.search,
      status: filters.status,
      agency_id: filters.agency_id,
      warehouse_id: filters.warehouse_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      offset,
    }),
    getPackages({
      search: filters.search,
      status: filters.status,
      agency_id: filters.agency_id,
      warehouse_id: filters.warehouse_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      offset,
    }),
    getAgenciesForFilter(),
    getWarehousesForFilter(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <HistoryTabs
        wrData={wrResult.data ?? []}
        wrCount={wrResult.count}
        pkgData={pkgResult.data ?? []}
        pkgCount={pkgResult.count}
        locale={locale}
        agencies={agencies}
        warehouses={warehouses}
        activeTab={filters.tab ?? "receipts"}
      />
    </div>
  );
}
