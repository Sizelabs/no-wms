import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { DestinationList } from "@/components/settings/destination-list";
import { getCouriers } from "@/lib/actions/couriers";
import { getDestinationsList } from "@/lib/actions/destinations";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserCourierScope } from "@/lib/auth/scope";

export default async function DestinationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "destinations", "read");

  const [{ data }, courierScope] = await Promise.all([
    getDestinationsList(),
    getUserCourierScope(),
  ]);

  // If user is scoped to courier(s), fetch their couriers with destinations
  let courierData: { id: string; name: string; organization_id: string; courier_destinations: { destination_id: string; is_active: boolean }[] }[] = [];
  if (courierScope !== null && courierScope.length > 0) {
    const { data: couriers } = await getCouriers();
    courierData = (couriers ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      organization_id: c.organization_id,
      courier_destinations: (c.courier_destinations ?? []).map((cd: { destination_id: string; is_active: boolean }) => ({
        destination_id: cd.destination_id,
        is_active: cd.is_active,
      })),
    }));
  }

  const canCreate = permissions.destinations.create;
  const canUpdate = permissions.destinations.update;
  const canDelete = permissions.destinations.delete;

  return (
    <div className="space-y-6">
      <PageHeader title="Destinos">
        {canCreate && (
          <Link
            href="destinations/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Destino
          </Link>
        )}
      </PageHeader>
      <DestinationList
        data={data ?? []}
        canUpdate={canUpdate}
        canDelete={canDelete}
        couriers={courierData}
      />
    </div>
  );
}
