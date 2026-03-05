import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { TariffScheduleForm } from "@/components/tariffs/tariff-schedule-form";
import { getShippingCategories, getTariffSchedule } from "@/lib/actions/tariffs";
import { getUserAgencyScope, getUserCourierScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function EditTariffPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
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

  const label = schedule.couriers?.name ?? schedule.agencies?.name ?? "";

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Tarifa${label ? ` — ${label}` : ""}`} />
      <TariffScheduleForm
        couriers={couriersResult.data ?? []}
        agencies={agenciesResult.data ?? []}
        destinations={destinationsResult.data ?? []}
        shippingCategories={categoriesResult.data ?? []}
        schedule={schedule}
      />
    </div>
  );
}
