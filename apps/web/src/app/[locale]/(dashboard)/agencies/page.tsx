import { useTranslations } from "next-intl";

import { AgencyList } from "@/components/agencies/agency-list";
import { PageHeader } from "@/components/layout/page-header";

export default function AgenciesPage() {
  const t = useTranslations("nav");

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
      <AgencyList />
    </div>
  );
}
