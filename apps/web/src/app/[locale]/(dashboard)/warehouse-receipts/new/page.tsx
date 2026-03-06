import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WrReceiptForm } from "@/components/warehouse/wr-receipt-form";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserRoleAssignments } from "@/lib/auth/roles";
import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewWarehouseReceiptPage({
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

  const [warehouseScope, assignments] = await Promise.all([
    getUserWarehouseScope(),
    getUserRoleAssignments(supabase, user.id),
  ]);

  const isSuperAdmin = assignments.some((a) => a.role === "super_admin");

  let warehousesQuery = supabase
    .from("warehouses")
    .select("id, name, code, organization_id, organizations(name)")
    .eq("is_active", true)
    .order("name");

  if (warehouseScope !== null && warehouseScope.length > 0) {
    warehousesQuery = warehousesQuery.in("id", warehouseScope);
  }

  const [agenciesResult, warehousesResult] = await Promise.all([
    supabase
      .from("agencies")
      .select("id, name, code, allow_multi_package, organization_id")
      .eq("is_active", true)
      .order("name"),
    warehouseScope !== null && warehouseScope.length === 0
      ? Promise.resolve({ data: [] })
      : warehousesQuery,
  ]);

  const agencies = agenciesResult.data ?? [];
  const warehouses = (warehousesResult.data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
    organization_id: w.organization_id as string,
    organization_name: (w.organizations as unknown as { name: string } | null)?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Recibir Paquete" />
      <WrReceiptForm
        agencies={agencies}
        warehouses={warehouses}
        isSuperAdmin={isSuperAdmin}
        locale={locale}
      />
    </div>
  );
}
