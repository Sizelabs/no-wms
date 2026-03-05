import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { TariffList } from "@/components/tariffs/tariff-list";
import { getTariffSchedules } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function TariffsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "tariffs", "read");
  const t = await getTranslations("nav");
  const { data } = await getTariffSchedules();

  const canCreate = permissions.tariffs.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("tariffs")}>
        <Link
          href="tariffs/categories"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Categorías
        </Link>
        {canCreate && (
          <Link
            href="tariffs/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Tarifa
          </Link>
        )}
      </PageHeader>
      <TariffList data={data ?? []} />
    </div>
  );
}
