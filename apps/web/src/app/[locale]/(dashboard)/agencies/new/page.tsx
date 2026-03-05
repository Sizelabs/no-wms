import { redirect } from "next/navigation";

import { AgencyCreateForm } from "@/components/agencies/agency-create-form";
import { PageHeader } from "@/components/layout/page-header";
import { getCouriers } from "@/lib/actions/couriers";
import { getDestinations } from "@/lib/actions/shipping-instructions";
import { getUserCourierScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewAgencyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ courier_id?: string }>;
}) {
  const { locale } = await params;
  const { courier_id } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect(`/${locale}`);

  const [couriersResult, destinationsResult, courierScope] = await Promise.all([
    getCouriers(),
    getDestinations(),
    getUserCourierScope(),
  ]);

  const couriers = (couriersResult.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }));

  const destinations = destinationsResult.data ?? [];

  // If user is scoped to a single courier, lock the selector
  const lockCourier = courierScope !== null && courierScope.length === 1;
  const defaultCourierId = courier_id ?? (lockCourier ? courierScope[0] : undefined);

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Agencia" />
      <AgencyCreateForm
        organizationId={profile.organization_id}
        couriers={couriers}
        destinations={destinations}
        defaultCourierId={defaultCourierId}
        lockCourier={lockCourier}
      />
    </div>
  );
}
