import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { CourierFilter } from "@/components/tariffs/courier-filter";
import { ModalityList } from "@/components/tariffs/modality-list";
import { getCouriers } from "@/lib/actions/couriers";
import { getModalitiesWithTariffs } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserCourierScope } from "@/lib/auth/scope";

export default async function ModalitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ courier?: string }>;
}) {
  const { locale } = await params;
  const { courier: courierId } = await searchParams;
  const { permissions } = await requirePermission(locale, "modalities", "read");

  const courierScope = await getUserCourierScope();

  // Courier-scoped users with a single courier: auto-redirect to their courier
  if (courierScope !== null && courierScope.length === 1 && !courierId) {
    redirect(`/${locale}/settings/modalities?courier=${courierScope[0]}`);
  }

  // Determine effective courier ID for data fetching
  const effectiveCourierId = courierId ?? (courierScope?.length === 1 ? courierScope[0] : undefined);

  const [{ data }, { data: couriersData }] = await Promise.all([
    getModalitiesWithTariffs(effectiveCourierId),
    getCouriers(),
  ]);

  const canCreate = permissions.modalities.create;
  const canUpdate = permissions.modalities.update;
  const canDelete = permissions.modalities.delete;

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
      <PageHeader title="Modalidades">
        {canCreate && !effectiveCourierId && (
          <Link
            href="modalities/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Modalidad
          </Link>
        )}
      </PageHeader>
      <CourierFilter
        couriers={couriers}
        selectedCourierId={effectiveCourierId}
        isCourierScoped={courierScope !== null}
      />
      <ModalityList
        data={data ?? []}
        selectedCourierId={effectiveCourierId}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
