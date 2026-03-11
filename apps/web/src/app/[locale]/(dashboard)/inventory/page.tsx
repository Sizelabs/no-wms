import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/ui/skeletons";
import { InventoryTable } from "@/components/warehouse/inventory-table";
import { getAgenciesForFilter, getPackages, getWarehousesForFilter } from "@/lib/actions/warehouse-receipts";
import { requirePermission } from "@/lib/auth/require-permission";

interface Filters {
  search?: string;
  status?: string;
  agency_id?: string;
  warehouse_id?: string;
  carrier?: string;
  is_damaged?: string;
  date_from?: string;
  date_to?: string;
  offset?: string;
}

async function InventoryHeader({ locale }: { locale: string }) {
  await requirePermission(locale, "inventory", "read");
  const t = await getTranslations("nav");
  return <PageHeader title={t("inventory")} />;
}

async function InventoryTableSection({ filters, locale }: { filters: Filters; locale: string }) {
  await requirePermission(locale, "inventory", "read");

  const [{ data, count }, agencies, warehouses] = await Promise.all([
    getPackages({
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
    <InventoryTable
      data={data ?? []}
      count={count}
      locale={locale}
      agencies={agencies}
      warehouses={warehouses}
    />
  );
}

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Filters>;
}) {
  const [{ locale }, filters] = await Promise.all([params, searchParams]);

  return (
    <div className="space-y-6">
      <Suspense>
        <InventoryHeader locale={locale} />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <InventoryTableSection filters={filters} locale={locale} />
      </Suspense>
    </div>
  );
}
