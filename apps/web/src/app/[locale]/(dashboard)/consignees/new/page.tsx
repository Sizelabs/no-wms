import { notFound } from "next/navigation";

import { ConsigneeCreateForm } from "@/components/consignees/consignee-create-form";
import { PageHeader } from "@/components/layout/page-header";
import { getAgencies } from "@/lib/actions/agencies";
import { generateCasillero } from "@/lib/actions/consignees";
import { getAllCountries } from "@/lib/actions/locations";

export default async function NewConsigneePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ agency_id?: string }>;
}) {
  await params;
  const { agency_id } = await searchParams;

  const [{ data: agencies }, countries] = await Promise.all([
    getAgencies(),
    getAllCountries(),
  ]);
  if (!agencies) {
    notFound();
  }

  // Pre-generate casillero if agency is known
  let defaultCasillero: string | undefined;
  if (agency_id) {
    try {
      defaultCasillero = await generateCasillero(agency_id);
    } catch {
      // Agency not found — ignore
    }
  }

  // Only pass id, name, code to client
  const agencyOptions = agencies.map((a: { id: string; name: string; code: string }) => ({
    id: a.id,
    name: a.name,
    code: a.code,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Consignatario" />
      <ConsigneeCreateForm
        agencies={agencyOptions}
        countries={countries}
        defaultAgencyId={agency_id}
        defaultCasillero={defaultCasillero}
      />
    </div>
  );
}
