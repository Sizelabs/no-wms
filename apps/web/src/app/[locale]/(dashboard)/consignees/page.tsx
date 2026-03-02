import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ConsigneeList } from "@/components/consignees/consignee-list";
import { PageHeader } from "@/components/layout/page-header";
import { getConsignees } from "@/lib/actions/consignees";

export default async function ConsigneesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("nav");

  const { data: consignees } = await getConsignees();

  return (
    <div className="space-y-6">
      <PageHeader title={t("consignees")}>
        <Link
          href={`/${locale}/consignees/new`}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nuevo Consignatario
        </Link>
      </PageHeader>
      <ConsigneeList consignees={consignees ?? []} />
    </div>
  );
}
