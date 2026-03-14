import { PageHeader } from "@/components/layout/page-header";
import { DestinationList } from "@/components/settings/destination-list";
import { getCouriers } from "@/lib/actions/couriers";
import { getDestinationsList } from "@/lib/actions/destinations";
import { getModalities } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function DestinationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "destinations", "read");

  const [{ data }, { data: modalities }] = await Promise.all([
    getDestinationsList(),
    getModalities(),
  ]);

  // Fetch couriers with destinations for coverage columns
  // Courier-scoped users see only their couriers; admins (null scope) see all
  const { data: couriers } = await getCouriers();
  const courierData = (couriers ?? []).map((c: { id: string; name: string; organization_id: string; courier_destinations: { destination_id: string; modality_id: string; is_active: boolean }[] }) => ({
    id: c.id,
    name: c.name,
    organization_id: c.organization_id,
    courier_destinations: (c.courier_destinations ?? []).map((cd: { destination_id: string; modality_id: string; is_active: boolean }) => ({
      destination_id: cd.destination_id,
      modality_id: cd.modality_id,
      is_active: cd.is_active,
    })),
  }));

  const canCreate = permissions.destinations.create;
  const canUpdate = permissions.destinations.update;
  const canDelete = permissions.destinations.delete;

  return (
    <div className="space-y-6">
      <PageHeader title="Destinos" />
      <DestinationList
        data={data ?? []}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        couriers={courierData}
        modalities={(modalities ?? []).map((m: { id: string; name: string; code: string }) => ({ id: m.id, name: m.name, code: m.code }))}
      />
    </div>
  );
}
