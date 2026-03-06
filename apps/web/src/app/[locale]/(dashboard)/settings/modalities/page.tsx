import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { CourierFilter } from "@/components/tariffs/courier-filter";
import { ModalityList } from "@/components/tariffs/modality-list";
import { getCouriers } from "@/lib/actions/couriers";
import { getModalitiesWithTariffs } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

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

  const [{ data }, { data: couriersData }] = await Promise.all([
    getModalitiesWithTariffs(courierId),
    getCouriers(),
  ]);

  const canCreate = permissions.modalities.create;
  const canUpdate = permissions.modalities.update;
  const canDelete = permissions.modalities.delete;

  const couriers = (couriersData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Modalidades">
        {canCreate && !courierId && (
          <Link
            href="modalities/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Modalidad
          </Link>
        )}
      </PageHeader>
      <CourierFilter couriers={couriers} selectedCourierId={courierId} />
      <ModalityList
        data={data ?? []}
        selectedCourierId={courierId}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
