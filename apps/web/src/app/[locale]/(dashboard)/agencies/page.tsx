import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AgencyList } from "@/components/agencies/agency-list";
import { PageHeader } from "@/components/layout/page-header";
import { getAgencies } from "@/lib/actions/agencies";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserCourierScope } from "@/lib/auth/scope";

export default async function AgenciesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "agencies", "read");
  const t = await getTranslations("nav");

  const [{ data: agencies }, courierScope] = await Promise.all([
    getAgencies(),
    getUserCourierScope(),
  ]);

  // If scoped to a single courier, pre-select it in the create form
  const newHref =
    courierScope !== null && courierScope.length === 1
      ? `/${locale}/agencies/new?courier_id=${courierScope[0]}`
      : `/${locale}/agencies/new`;

  const canCreate = permissions.agencies.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("agencies")}>
        {canCreate && (
          <Link
            href={newHref}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Agencia
          </Link>
        )}
      </PageHeader>
      <AgencyList agencies={agencies ?? []} />
    </div>
  );
}
