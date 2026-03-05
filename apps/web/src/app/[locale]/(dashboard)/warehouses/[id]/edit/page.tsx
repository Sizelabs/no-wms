import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WarehouseEditForm } from "@/components/warehouses/warehouse-edit-form";
import { getAllCountries } from "@/lib/actions/locations";
import { getWarehouse } from "@/lib/actions/warehouses";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function WarehouseEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "warehouses", "update");

  const [{ data: warehouse }, countries] = await Promise.all([
    getWarehouse(id),
    getAllCountries(),
  ]);
  if (!warehouse) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Bodega — ${warehouse.name}`} />
      <WarehouseEditForm warehouse={warehouse} countries={countries} />
    </div>
  );
}
