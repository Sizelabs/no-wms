import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AgencyList } from "@/components/agencies/agency-list";
import { PageHeader } from "@/components/layout/page-header";
import { getAgencies } from "@/lib/actions/agencies";
import { getUserCourrierScope } from "@/lib/auth/scope";

export default async function AgenciesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("nav");

  const [{ data: agencies }, courrierScope] = await Promise.all([
    getAgencies(),
    getUserCourrierScope(),
  ]);

  // If scoped to a single courrier, pre-select it in the create form
  const newHref =
    courrierScope !== null && courrierScope.length === 1
      ? `/${locale}/agencies/new?courrier_id=${courrierScope[0]}`
      : `/${locale}/agencies/new`;

  return (
    <div className="space-y-6">
      <PageHeader title={t("agencies")}>
        <Link
          href={newHref}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nueva Agencia
        </Link>
      </PageHeader>
      <AgencyList agencies={agencies ?? []} />
    </div>
  );
}
