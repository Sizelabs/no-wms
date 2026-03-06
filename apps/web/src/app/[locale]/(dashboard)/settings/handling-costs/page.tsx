import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { CourierFilter } from "@/components/tariffs/courier-filter";
import { HandlingCostList } from "@/components/tariffs/handling-cost-list";
import { getCouriers } from "@/lib/actions/couriers";
import { getHandlingCostsWithTariffs } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function HandlingCostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ courier?: string }>;
}) {
  const { locale } = await params;
  const { courier: courierId } = await searchParams;
  const { permissions } = await requirePermission(locale, "handling_costs", "read");

  const [{ data }, { data: couriersData }] = await Promise.all([
    getHandlingCostsWithTariffs(courierId),
    getCouriers(),
  ]);

  const canCreate = permissions.handling_costs.create;
  const canUpdate = permissions.handling_costs.update;
  const canDelete = permissions.handling_costs.delete;

  const couriers = (couriersData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Costos de Manejo">
        {canCreate && !courierId && (
          <Link
            href="handling-costs/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Costo de Manejo
          </Link>
        )}
      </PageHeader>
      <CourierFilter couriers={couriers} selectedCourierId={courierId} />
      <HandlingCostList
        data={data ?? []}
        selectedCourierId={courierId}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
