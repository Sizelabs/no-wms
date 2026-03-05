import { notFound } from "next/navigation";

import { AgencyEditForm } from "@/components/agencies/agency-edit-form";
import { PageHeader } from "@/components/layout/page-header";
import { getAgency } from "@/lib/actions/agencies";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function AgencyEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "agencies", "update");

  const { data: agency } = await getAgency(id);
  if (!agency) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Agencia — ${agency.name}`} />
      <AgencyEditForm agency={agency} />
    </div>
  );
}
