import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ConsigneeList } from "@/components/consignees/consignee-list";
import { PageHeader } from "@/components/layout/page-header";
import { getConsignees } from "@/lib/actions/consignees";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ConsigneesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "consignees", "read");
  const t = await getTranslations("nav");

  const { data: consignees } = await getConsignees();

  const canCreate = permissions.consignees.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("consignees")}>
        {canCreate && (
          <Link
            href={`/${locale}/consignees/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Consignatario
          </Link>
        )}
      </PageHeader>
      <ConsigneeList consignees={consignees ?? []} />
    </div>
  );
}
