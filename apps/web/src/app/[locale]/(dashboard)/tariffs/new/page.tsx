import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { TariffScheduleForm } from "@/components/tariffs/tariff-schedule-form";
import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewTariffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const agencyScope = await getUserAgencyScope();

  let agenciesQuery = supabase
    .from("agencies")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (agencyScope !== null && agencyScope.length > 0) {
    agenciesQuery = agenciesQuery.in("id", agencyScope);
  }

  const [agenciesResult, destinationsResult] = await Promise.all([
    agencyScope !== null && agencyScope.length === 0
      ? Promise.resolve({ data: [] })
      : agenciesQuery,
    supabase
      .from("destination_countries")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Tarifa" />
      <TariffScheduleForm
        agencies={agenciesResult.data ?? []}
        destinations={destinationsResult.data ?? []}
      />
    </div>
  );
}
