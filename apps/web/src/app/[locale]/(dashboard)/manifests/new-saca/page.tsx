import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SacaCreateForm } from "@/components/manifests/saca-create-form";
import { getUserAgencyScope, getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewSacaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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

  let wrsQuery = supabase
    .from("warehouse_receipts")
    .select("id, wr_number, tracking_number")
    .eq("status", "in_dispatch")
    .order("received_at", { ascending: false })
    .limit(500);

  if (warehouseScope !== null && warehouseScope.length > 0) {
    warehousesQuery = warehousesQuery.in("id", warehouseScope);
    wrsQuery = wrsQuery.in("warehouse_id", warehouseScope);
  }

  if (agencyScope !== null && agencyScope.length > 0) {
    wrsQuery = wrsQuery.in("agency_id", agencyScope);
  }

  const emptyResult = Promise.resolve({ data: [] });
  const isEmpty =
    (warehouseScope !== null && warehouseScope.length === 0) ||
    (agencyScope !== null && agencyScope.length === 0);

  const [warehousesResult, mawbsResult, wrsResult] = await Promise.all([
    isEmpty ? emptyResult : warehousesQuery,
    supabase
      .from("mawbs")
      .select("id, mawb_number")
      .in("status", ["created", "ready_for_flight"])
      .order("created_at", { ascending: false }),
    isEmpty ? emptyResult : wrsQuery,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Saca" />
      <SacaCreateForm
        warehouses={warehousesResult.data ?? []}
        mawbs={mawbsResult.data ?? []}
        availableWrs={wrsResult.data ?? []}
      />
    </div>
  );
}
