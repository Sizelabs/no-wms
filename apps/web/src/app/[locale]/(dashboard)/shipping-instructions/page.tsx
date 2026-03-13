import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { CreateShipmentButton } from "@/components/shipping/create-shipment-button";
import { SiList } from "@/components/shipping/si-list";
import { getCarriers } from "@/lib/actions/carriers";
import { getShippingInstructions } from "@/lib/actions/shipping-instructions";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function ShippingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { userId, permissions } = await requirePermission(locale, "shipping", "read");
  const t = await getTranslations("nav");
  const supabase = await createClient();
  const warehouseScope = await getUserWarehouseScope();

  let warehousesQuery = supabase
    .from("warehouses")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (warehouseScope !== null && warehouseScope.length > 0) {
    warehousesQuery = warehousesQuery.in("id", warehouseScope);
  }

  // Fetch user's org for MAWB shipper auto-fill
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  const [siResult, warehousesResult, destinationsResult, carriersResult, agenciesResult, orgResult] =
    await Promise.all([
      getShippingInstructions(),
      warehouseScope !== null && warehouseScope.length === 0
        ? Promise.resolve({ data: [] })
        : warehousesQuery,
      supabase.from("destinations").select("id, city, country_code").eq("is_active", true).order("city"),
      getCarriers(),
      supabase.from("agencies").select("id, name, code").eq("is_active", true).order("name"),
      profile?.organization_id
        ? supabase.from("organizations").select("name").eq("id", profile.organization_id).single()
        : Promise.resolve({ data: null }),
    ]);

  const canCreate = permissions.shipping.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("shippingInstructions")}>
        {canCreate && <CreateShipmentButton />}
      </PageHeader>
      <SiList
        data={siResult.data ?? []}
        locale={locale}
        warehouses={warehousesResult.data ?? []}
        destinations={destinationsResult.data ?? []}
        carriers={carriersResult.data ?? []}
        agencies={agenciesResult.data ?? []}
        orgName={orgResult.data?.name ?? undefined}
      />
    </div>
  );
}
