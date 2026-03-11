import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { HistoryTabs } from "@/components/history/history-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import {
  getAgenciesForFilter,
  getPackages,
  getWarehouseReceiptsForHistory,
  getWarehousesForFilter,
} from "@/lib/actions/warehouse-receipts";
import { requirePermission } from "@/lib/auth/require-permission";

interface Filters {
  tab?: string;
  search?: string;
  status?: string;
  agency_id?: string;
  warehouse_id?: string;
  date_from?: string;
  date_to?: string;
  offset?: string;
}

async function HistoryHeader({ locale }: { locale: string }) {
  await requirePermission(locale, "history", "read");
  const t = await getTranslations("history");
  return <PageHeader title={t("title")} description={t("description")} />;
}

async function HistoryTableSection({ filters, locale }: { filters: Filters; locale: string }) {
  await requirePermission(locale, "history", "read");
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
  );
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Filters>;
}) {
  const [{ locale }, filters] = await Promise.all([params, searchParams]);

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageHeaderSkeleton />}>
        <HistoryHeader locale={locale} />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <HistoryTableSection filters={filters} locale={locale} />
      </Suspense>
    </div>
  );
}
