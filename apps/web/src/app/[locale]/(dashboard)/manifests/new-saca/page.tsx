import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SacaCreateForm } from "@/components/manifests/saca-create-form";
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

  const [warehousesResult, mawbsResult, wrsResult] = await Promise.all([
    supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
    supabase
      .from("mawbs")
      .select("id, mawb_number")
      .in("status", ["created", "ready_for_flight"])
      .order("created_at", { ascending: false }),
    supabase
      .from("warehouse_receipts")
      .select("id, wr_number, tracking_number")
      .eq("status", "in_dispatch")
      .order("received_at", { ascending: false })
      .limit(500),
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
