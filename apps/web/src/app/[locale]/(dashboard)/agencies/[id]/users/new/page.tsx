import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { InviteAgencyUserForm } from "@/components/users/invite-agency-user-form";
import { getAgency } from "@/lib/actions/agencies";

export default async function AgencyInviteUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;

  const { data: agency } = await getAgency(id);
  if (!agency) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitar Usuario"
        description={`Agencia: ${agency.name}`}
      />
      <InviteAgencyUserForm
        organizationId={agency.organization_id}
        agencyId={agency.id}
      />
    </div>
  );
}
