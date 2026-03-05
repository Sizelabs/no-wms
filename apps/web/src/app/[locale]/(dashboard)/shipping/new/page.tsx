import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SiCreateForm } from "@/components/shipping/si-create-form";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserAgencyScope, getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewShippingInstructionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "shipping", "create");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [warehouseScope, agencyScope] = await Promise.all([
    getUserWarehouseScope(),
    getUserAgencyScope(),
  ]);

  let warehousesQuery = supabase
    .from("warehouses")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  let agenciesQuery = supabase
    .from("agencies")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  let wrsQuery = supabase
    .from("warehouse_receipts")
    .select("id, wr_number, status, total_billable_weight_lb, packages(tracking_number, carrier)")
    .in("status", ["received", "in_warehouse"])
    .order("received_at", { ascending: false })
    .limit(500);

  if (warehouseScope !== null && warehouseScope.length > 0) {
    warehousesQuery = warehousesQuery.in("id", warehouseScope);
    wrsQuery = wrsQuery.in("warehouse_id", warehouseScope);
  }

  if (agencyScope !== null && agencyScope.length > 0) {
    agenciesQuery = agenciesQuery.in("id", agencyScope);
    wrsQuery = wrsQuery.in("agency_id", agencyScope);
  }

  const emptyResult = Promise.resolve({ data: [] });
  const isEmpty =
    (warehouseScope !== null && warehouseScope.length === 0) ||
    (agencyScope !== null && agencyScope.length === 0);

  const [agenciesResult, warehousesResult, consigneesResult, destinationsResult, wrsResult] =
    await Promise.all([
      isEmpty ? emptyResult : agenciesQuery,
      isEmpty ? emptyResult : warehousesQuery,
      supabase.from("consignees").select("id, name").order("name").limit(1000),
      supabase.from("destinations").select("id, city, country_code").order("city"),
      isEmpty ? emptyResult : wrsQuery,
    ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Instrucción de Embarque" />
      <SiCreateForm
        agencies={agenciesResult.data ?? []}
        warehouses={warehousesResult.data ?? []}
        consignees={consigneesResult.data ?? []}
        destinations={destinationsResult.data ?? []}
        availableWrs={wrsResult.data ?? []}
      />
    </div>
  );
}
