import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WrBatchImport } from "@/components/warehouse/wr-batch-import";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function ImportWarehouseReceiptsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "warehouse_receipts", "create");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

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
    supabase.from("agencies").select("id, name, code").eq("is_active", true).order("name"),
    warehouseScope !== null && warehouseScope.length === 0
      ? Promise.resolve({ data: [] })
      : warehousesQuery,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Importar Paquetes (Lote)" />
      <WrBatchImport
        agencies={agenciesResult.data ?? []}
        warehouses={warehousesResult.data ?? []}
      />
    </div>
  );
}
