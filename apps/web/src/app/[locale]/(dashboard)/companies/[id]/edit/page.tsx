import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CompanyEditForm } from "@/components/companies/company-edit-form";
import { PageHeader } from "@/components/layout/page-header";
import { getOrganization } from "@/lib/actions/organizations";

export default async function CompanyEditPage({
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
      <PageHeader title={`${t("companies")} — Editar`} />
      <CompanyEditForm company={company} />
    </div>
  );
}
