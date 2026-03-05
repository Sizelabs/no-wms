import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { InviteAgencyUserForm } from "@/components/users/invite-agency-user-form";
import { getAgency } from "@/lib/actions/agencies";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function AgencyInviteUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "users", "create");

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
