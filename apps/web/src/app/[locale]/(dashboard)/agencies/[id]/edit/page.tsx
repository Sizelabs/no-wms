import { notFound } from "next/navigation";

import { AgencyEditForm } from "@/components/agencies/agency-edit-form";
import { PageHeader } from "@/components/layout/page-header";
import { getAgency } from "@/lib/actions/agencies";

export default async function AgencyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: agency } = await getAgency(id);
  if (!agency) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Agencia — ${agency.name}`} />
      <AgencyEditForm agency={agency} />
    </div>
  );
}
