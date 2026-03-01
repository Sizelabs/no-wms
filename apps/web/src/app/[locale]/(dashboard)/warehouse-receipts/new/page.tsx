import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WrReceiptForm } from "@/components/warehouse/wr-receipt-form";
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
  const [agenciesResult, warehousesResult] = await Promise.all([
    supabase.from("agencies").select("id, name, code").eq("is_active", true).order("name"),
    supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
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
