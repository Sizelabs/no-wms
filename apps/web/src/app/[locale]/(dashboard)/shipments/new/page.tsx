import { PageHeader } from "@/components/layout/page-header";
import { ShipmentCreateForm } from "@/components/shipments/shipment-create-form";
import { getCarriers } from "@/lib/actions/carriers";
import { getUnassignedFinalizedSIs } from "@/lib/actions/shipments";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewShipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "shipments", "create");
  const supabase = await createClient();

  const warehouseScope = await getUserWarehouseScope();

  let warehousesQuery = supabase
    .from("warehouses")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (warehouseScope !== null && warehouseScope.length > 0) {
    warehousesQuery = warehousesQuery.in("id", warehouseScope);
  }

  const [warehousesResult, destinationsResult, carriersResult, agenciesResult, unassignedSIsResult] = await Promise.all([
    warehouseScope !== null && warehouseScope.length === 0
      ? Promise.resolve({ data: [] })
      : warehousesQuery,
    supabase.from("destinations").select("id, city, country_code").eq("is_active", true).order("city"),
    getCarriers(),
    supabase.from("agencies").select("id, name, code").eq("is_active", true).order("name"),
    getUnassignedFinalizedSIs(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Embarque" />
      <ShipmentCreateForm
        warehouses={warehousesResult.data ?? []}
        destinations={destinationsResult.data ?? []}
        carriers={carriersResult.data ?? []}
        agencies={agenciesResult.data ?? []}
        unassignedSIs={unassignedSIsResult.data ?? []}
      />
    </div>
  );
}
