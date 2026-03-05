import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { TariffScheduleForm } from "@/components/tariffs/tariff-schedule-form";
import { getChargeTypes, getTariffSchedule } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserAgencyScope, getUserCourierScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function EditTariffPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "tariffs", "update");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: schedule, error } = await getTariffSchedule(id);
  if (error || !schedule) notFound();

  const [courierScope, agencyScope] = await Promise.all([
    getUserCourierScope(),
    getUserAgencyScope(),
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

  const [couriersResult, agenciesResult, warehousesResult, destinationsResult, chargeTypesResult] = await Promise.all([
    courierScope !== null && courierScope.length === 0
      ? Promise.resolve({ data: [] })
      : couriersQuery,
    agencyScope !== null && agencyScope.length === 0
      ? Promise.resolve({ data: [] })
      : agenciesQuery,
    supabase
      .from("warehouses")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("destinations")
      .select("id, city, country_code")
      .eq("is_active", true)
      .order("city"),
    getChargeTypes(),
  ]);

  const label = schedule.charge_types?.name ?? "";

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Tarifa${label ? ` — ${label}` : ""}`} />
      <TariffScheduleForm
        warehouses={warehousesResult.data ?? []}
        chargeTypes={chargeTypesResult.data ?? []}
        destinations={destinationsResult.data ?? []}
        couriers={couriersResult.data ?? []}
        agencies={agenciesResult.data ?? []}
        schedule={schedule}
      />
    </div>
  );
}
