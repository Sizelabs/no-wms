import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SiCreateForm } from "@/components/shipping/si-create-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewShippingInstructionPage({
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

  const [agenciesResult, warehousesResult, consigneesResult, destinationsResult, wrsResult] =
    await Promise.all([
      supabase.from("agencies").select("id, name, code").eq("is_active", true).order("name"),
      supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
      supabase.from("consignees").select("id, name").order("name").limit(1000),
      supabase.from("destination_countries").select("id, name").order("name"),
      supabase
        .from("warehouse_receipts")
        .select("id, wr_number, tracking_number, carrier, status, billable_weight_lb")
        .in("status", ["received", "in_warehouse"])
        .order("received_at", { ascending: false })
        .limit(500),
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
