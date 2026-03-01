import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WrBatchImport } from "@/components/warehouse/wr-batch-import";
import { createClient } from "@/lib/supabase/server";

export default async function ImportWarehouseReceiptsPage({
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

  const [agenciesResult, warehousesResult] = await Promise.all([
    supabase.from("agencies").select("id, name, code").eq("is_active", true).order("name"),
    supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
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
