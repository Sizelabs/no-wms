import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { TariffScheduleForm } from "@/components/tariffs/tariff-schedule-form";
import { getShippingCategories } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserAgencyScope, getUserAllowedTariffSide, getUserCourierScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewTariffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "tariffs", "create");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const [courierScope, agencyScope, allowedSide] = await Promise.all([
    getUserCourierScope(),
    getUserAgencyScope(),
    getUserAllowedTariffSide(),
  ]);

  let couriersQuery = supabase
    .from("couriers")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (courierScope !== null && courierScope.length > 0) {
    couriersQuery = couriersQuery.in("id", courierScope);
  }

  let agenciesQuery = supabase
    .from("agencies")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (agencyScope !== null && agencyScope.length > 0) {
    agenciesQuery = agenciesQuery.in("id", agencyScope);
  }

  const [couriersResult, agenciesResult, destinationsResult, categoriesResult] = await Promise.all([
    courierScope !== null && courierScope.length === 0
      ? Promise.resolve({ data: [] })
      : couriersQuery,
    agencyScope !== null && agencyScope.length === 0
      ? Promise.resolve({ data: [] })
      : agenciesQuery,
    supabase
      .from("destinations")
      .select("id, city, country_code")
      .eq("is_active", true)
      .order("city"),
    getShippingCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Tarifa" />
      <TariffScheduleForm
        couriers={couriersResult.data ?? []}
        agencies={agenciesResult.data ?? []}
        destinations={destinationsResult.data ?? []}
        shippingCategories={categoriesResult.data ?? []}
        allowedSide={allowedSide}
      />
    </div>
  );
}
