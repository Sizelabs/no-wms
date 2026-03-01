import { getTranslations } from "next-intl/server";

import { CompanyCreateForm } from "@/components/companies/company-create-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function NewCompanyPage() {
  const t = await getTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("companies")} — Nueva`} />
      <CompanyCreateForm />
    </div>
  );
}
