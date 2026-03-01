import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WarehouseEditForm } from "@/components/warehouses/warehouse-edit-form";
import { getWarehouse } from "@/lib/actions/warehouses";

export default async function WarehouseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: warehouse } = await getWarehouse(id);
  if (!warehouse) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Bodega — ${warehouse.name}`} />
      <WarehouseEditForm warehouse={warehouse} />
    </div>
  );
}
