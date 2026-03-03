import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WrReceiptForm } from "@/components/warehouse/wr-receipt-form";
import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewWarehouseReceiptPage({
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

  // Fetch agencies and warehouses for the form
  const warehouseScope = await getUserWarehouseScope();

  let warehousesQuery = supabase
    .from("warehouses")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (warehouseScope !== null && warehouseScope.length > 0) {
    warehousesQuery = warehousesQuery.in("id", warehouseScope);
  }

  const [agenciesResult, warehousesResult] = await Promise.all([
    supabase.from("agencies").select("id, name, code, allow_multi_package").eq("is_active", true).order("name"),
    warehouseScope !== null && warehouseScope.length === 0
      ? Promise.resolve({ data: [] })
      : warehousesQuery,
  ]);

  const agencies = agenciesResult.data ?? [];
  const warehouses = warehousesResult.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Recibir Paquete" />
      <WrReceiptForm
        agencies={agencies}
        warehouses={warehouses}
        locale={locale}
      />
    </div>
  );
}
