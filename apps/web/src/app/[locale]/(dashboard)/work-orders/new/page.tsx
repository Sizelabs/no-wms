import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WoCreateForm } from "@/components/work-orders/wo-create-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewWorkOrderPage({
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

  const [agenciesResult, warehousesResult, wrsResult] = await Promise.all([
    supabase.from("agencies").select("id, name, code").eq("is_active", true).order("name"),
    supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
    supabase
      .from("warehouse_receipts")
      .select("id, wr_number, tracking_number, carrier, status")
      .in("status", ["received", "in_warehouse"])
      .order("received_at", { ascending: false })
      .limit(500),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Orden de Trabajo" />
      <WoCreateForm
        agencies={agenciesResult.data ?? []}
        warehouses={warehousesResult.data ?? []}
        availableWrs={wrsResult.data ?? []}
      />
    </div>
  );
}
