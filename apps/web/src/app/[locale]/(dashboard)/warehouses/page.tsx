import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { WarehouseList } from "@/components/warehouses/warehouse-list";
import { getWarehouses } from "@/lib/actions/warehouses";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function WarehousesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "warehouses", "read");
  const t = await getTranslations("nav");

  const { data: warehouses } = await getWarehouses();

  const canCreate = permissions.warehouses.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("warehouses")}>
        {canCreate && (
          <Link
            href={`/${locale}/warehouses/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Bodega
          </Link>
        )}
      </PageHeader>
      <WarehouseList warehouses={warehouses ?? []} />
    </div>
  );
}
