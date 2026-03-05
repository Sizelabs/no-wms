import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { TariffList } from "@/components/tariffs/tariff-list";
import { getTariffSchedules } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export default async function TariffsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "tariffs", "read");
  const t = await getTranslations("nav");
  const supabase = await createClient();

  const [{ data }, warehousesResult] = await Promise.all([
    getTariffSchedules(),
    supabase.from("warehouses").select("id, name").eq("is_active", true).order("name"),
  ]);

  const canCreate = permissions.tariffs.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("tariffs")}>
        <Link
          href="tariffs/handling-costs"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Handling Costs
        </Link>
        <Link
          href="tariffs/modalities"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Modalidades
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
      <TariffList data={data ?? []} warehouses={warehousesResult.data ?? []} />
    </div>
  );
}
