import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { WrHistoryTable } from "@/components/warehouse/wr-history-table";
import { getAgenciesForFilter, getStorageSettings, getWarehouseReceipts, getWarehousesForFilter } from "@/lib/actions/warehouse-receipts";
import { requirePermission } from "@/lib/auth/require-permission";

interface Filters {
  search?: string;
  status?: string;
  agency_id?: string;
  warehouse_id?: string;
  carrier?: string;
  date_from?: string;
  date_to?: string;
  offset?: string;
}

async function WrHeader({ locale }: { locale: string }) {
  const { permissions } = await requirePermission(locale, "warehouse_receipts", "read");
  const t = await getTranslations("nav");
  const canCreate = permissions.warehouse_receipts.create;

  return (
    <PageHeader title={t("warehouseReceipts")}>
      {canCreate && (
        <>
          <Link
            href={`/${locale}/warehouse-receipts/import`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Importar lote
          </Link>
          <Link
            href={`/${locale}/warehouse-receipts/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Recibir Paquete
          </Link>
        </>
      )}
    </PageHeader>
  );
}

async function WrTableSection({ filters, locale }: { filters: Filters; locale: string }) {
  // Ensure permission before loading data
  await requirePermission(locale, "warehouse_receipts", "read");

  const [{ data, count }, agencies, warehouses, storageSettings] = await Promise.all([
    getWarehouseReceipts({
      search: filters.search,
      status: filters.status ?? "received,in_warehouse,in_work_order",
      agency_id: filters.agency_id,
      warehouse_id: filters.warehouse_id,
      carrier: filters.carrier,
      date_from: filters.date_from,
      date_to: filters.date_to,
      offset: filters.offset ? parseInt(filters.offset, 10) : 0,
    }),
    getAgenciesForFilter(),
    getWarehousesForFilter(),
    getStorageSettings(),
  ]);

  return (
    <WrHistoryTable
      data={data ?? []}
      count={count}
      locale={locale}
      agencies={agencies}
      warehouses={warehouses}
      freeStorageDays={storageSettings.freeStorageDays}
      storageDailyRate={storageSettings.storageDailyRate}
    />
  );
}

export default async function WarehouseReceiptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Filters>;
}) {
  const [{ locale }, filters] = await Promise.all([params, searchParams]);

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageHeaderSkeleton hasButtons />}>
        <WrHeader locale={locale} />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <WrTableSection filters={filters} locale={locale} />
      </Suspense>
    </div>
  );
}
