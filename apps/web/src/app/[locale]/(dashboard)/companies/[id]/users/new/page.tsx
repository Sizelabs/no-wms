import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { InviteUserForm } from "@/components/users/invite-user-form";
import { getOrganization } from "@/lib/actions/organizations";

export default async function CompanyInviteUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("nav");

  const { data: company } = await getOrganization(id);
  if (!company) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t("users")} — Invitar`}
        description={company.name}
      />
      <InviteUserForm organizationId={id} />
    </div>
  );
}
