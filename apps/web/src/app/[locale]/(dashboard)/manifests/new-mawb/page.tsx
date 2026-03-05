import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { MawbCreateForm } from "@/components/manifests/mawb-create-form";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewMawbPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "manifests", "create");
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

  const [warehousesResult, destinationsResult] = await Promise.all([
    warehouseScope !== null && warehouseScope.length === 0
      ? Promise.resolve({ data: [] })
      : warehousesQuery,
    supabase.from("destinations").select("id, city, country_code").order("city"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo MAWB" />
      <MawbCreateForm
        warehouses={warehousesResult.data ?? []}
        destinations={destinationsResult.data ?? []}
      />
    </div>
  );
}
