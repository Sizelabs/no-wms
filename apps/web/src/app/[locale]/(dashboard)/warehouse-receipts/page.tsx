import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { WrHistoryTable } from "@/components/warehouse/wr-history-table";
import { getAgenciesForFilter, getStorageSettings, getWarehouseReceipts, getWarehousesForFilter } from "@/lib/actions/warehouse-receipts";

export default async function WarehouseReceiptsPage({
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
    date_from?: string;
    date_to?: string;
    offset?: string;
  }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const t = await getTranslations("nav");

  const [{ data, count }, agencies, warehouses, storageSettings] = await Promise.all([
    getWarehouseReceipts({
      search: filters.search,
      status: filters.status,
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
    <div className="space-y-6">
      <PageHeader title={t("warehouseReceipts")}>
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
      </PageHeader>
      <WrHistoryTable
        data={data ?? []}
        count={count}
        locale={locale}
        agencies={agencies}
        warehouses={warehouses}
        freeStorageDays={storageSettings.freeStorageDays}
        storageDailyRate={storageSettings.storageDailyRate}
      />
    </div>
  );
}
