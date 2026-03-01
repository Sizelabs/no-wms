import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { WarehouseCreateForm } from "@/components/warehouses/warehouse-create-form";
import { getAllCountries } from "@/lib/actions/locations";
import { getOrganization } from "@/lib/actions/organizations";

export default async function CompanyNewWarehousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("nav");

  const [{ data: company }, countries] = await Promise.all([
    getOrganization(id),
    getAllCountries(),
  ]);
  if (!company) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t("warehouses")} — Nueva`}
        description={company.name}
      />
      <WarehouseCreateForm organizationId={id} countries={countries} />
    </div>
  );
}
