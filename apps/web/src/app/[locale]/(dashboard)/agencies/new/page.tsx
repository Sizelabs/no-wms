import { redirect } from "next/navigation";

import { AgencyCreateForm } from "@/components/agencies/agency-create-form";
import { PageHeader } from "@/components/layout/page-header";
import { getCourriers } from "@/lib/actions/courriers";
import { getDestinationCountries } from "@/lib/actions/shipping-instructions";
import { getUserCourrierScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewAgencyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ courrier_id?: string }>;
}) {
  const { locale } = await params;
  const { courrier_id } = await searchParams;
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

  const [courriersResult, countriesResult, courrierScope] = await Promise.all([
    getCourriers(),
    getDestinationCountries(),
    getUserCourrierScope(),
  ]);

  const courriers = (courriersResult.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }));

  const destinationCountries = countriesResult.data ?? [];

  // If user is scoped to a single courrier, lock the selector
  const lockCourrier = courrierScope !== null && courrierScope.length === 1;
  const defaultCourrierId = courrier_id ?? (lockCourrier ? courrierScope[0] : undefined);

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Agencia" />
      <AgencyCreateForm
        organizationId={profile.organization_id}
        courriers={courriers}
        destinationCountries={destinationCountries}
        defaultCourrierId={defaultCourrierId}
        lockCourrier={lockCourrier}
      />
    </div>
  );
}
