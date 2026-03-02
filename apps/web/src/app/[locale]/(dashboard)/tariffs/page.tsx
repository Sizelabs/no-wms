import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { TariffList } from "@/components/tariffs/tariff-list";
import { getTariffSchedules } from "@/lib/actions/tariffs";

export default async function TariffsPage() {
  const t = await getTranslations("nav");
  const { data } = await getTariffSchedules();

  return (
    <div className="space-y-6">
      <PageHeader title={t("tariffs")}>
        <Link
          href="tariffs/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nueva Tarifa
        </Link>
      </PageHeader>
      <TariffList data={data ?? []} />
    </div>
  );
}
