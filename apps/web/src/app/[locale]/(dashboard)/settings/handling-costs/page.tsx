import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { CourierFilter } from "@/components/tariffs/courier-filter";
import { HandlingCostList } from "@/components/tariffs/handling-cost-list";
import { getCouriers } from "@/lib/actions/couriers";
import { getHandlingCostsWithTariffs } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserCourierScope } from "@/lib/auth/scope";

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

  const courierScope = await getUserCourierScope();

  // Courier-scoped users with a single courier: auto-redirect to their courier
  if (courierScope !== null && courierScope.length === 1 && !courierId) {
    redirect(`/${locale}/settings/handling-costs?courier=${courierScope[0]}`);
  }

  // Determine effective courier ID for data fetching
  const effectiveCourierId = courierId ?? (courierScope?.length === 1 ? courierScope[0] : undefined);

  const [{ data }, { data: couriersData }] = await Promise.all([
    getHandlingCostsWithTariffs(effectiveCourierId),
    getCouriers(),
  ]);

  const canCreate = permissions.handling_costs.create;
  const canUpdate = permissions.handling_costs.update;
  const canDelete = permissions.handling_costs.delete;

  // Filter couriers list to only scoped ones for courier users
  const allCouriers = (couriersData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }));
  const couriers = courierScope !== null
    ? allCouriers.filter((c) => courierScope.includes(c.id))
    : allCouriers;

  return (
    <div className="space-y-6">
      <PageHeader title="Costos de Manejo" />
      <CourierFilter
        couriers={couriers}
        selectedCourierId={effectiveCourierId}
        isCourierScoped={courierScope !== null}
      />
      <HandlingCostList
        data={data ?? []}
        selectedCourierId={effectiveCourierId}
        canCreate={canCreate && !effectiveCourierId}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
