import { getTranslations } from "next-intl/server";

import { AgencyList } from "@/components/agencies/agency-list";
import { PageHeader } from "@/components/layout/page-header";
import { getAgencies } from "@/lib/actions/agencies";

export default async function AgenciesPage() {
  const t = await getTranslations("nav");

  const { data: agencies } = await getAgencies();

  return (
    <div className="space-y-6">
      <PageHeader title={t("agencies")}>
        <button
          type="button"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nueva Agencia
        </button>
      </PageHeader>
      <AgencyList agencies={agencies ?? []} />
    </div>
  );
}
