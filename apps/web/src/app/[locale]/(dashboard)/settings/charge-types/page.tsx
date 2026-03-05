import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { ChargeTypeList } from "@/components/tariffs/charge-type-list";
import { getChargeTypes } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ChargeTypesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "charge_types", "read");
  const { data } = await getChargeTypes();

  const canCreate = permissions.charge_types.create;

  return (
    <div className="space-y-6">
      <PageHeader title="Tipos de Cargo">
        {canCreate && (
          <Link
            href="charge-types/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Tipo de Cargo
          </Link>
        )}
      </PageHeader>
      <ChargeTypeList data={data ?? []} />
    </div>
  );
}
