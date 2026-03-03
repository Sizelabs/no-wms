import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CompanyDetail } from "@/components/companies/company-detail";
import { PageHeader } from "@/components/layout/page-header";
import {
  getOrganization,
  getOrganizationAgencies,
  getOrganizationCourriers,
  getOrganizationUsers,
  getOrganizationWarehouses,
} from "@/lib/actions/organizations";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("nav");

  const { data: company } = await getOrganization(id);
  if (!company) notFound();

  const [warehousesResult, courriersResult, agenciesResult, usersResult] = await Promise.all([
    getOrganizationWarehouses(id),
    getOrganizationCourriers(id),
    getOrganizationAgencies(id),
    getOrganizationUsers(id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("companies")} — ${company.name}`} />
      <CompanyDetail
        company={company}
        warehouses={warehousesResult.data ?? []}
        courriers={courriersResult.data ?? []}
        agencies={agenciesResult.data ?? []}
        users={usersResult.data ?? []}
      />
    </div>
  );
}
