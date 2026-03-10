import { PageHeader } from "@/components/layout/page-header";
import { LocationManager } from "@/components/locations/location-manager";
import { getWarehousesForLocationManagement } from "@/lib/actions/location-management";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "locations", "read");
  const warehouses = await getWarehousesForLocationManagement();

  return (
    <div className="space-y-6">
      <PageHeader title="Ubicaciones" description="Gestión de zonas y ubicaciones de bodega" />
      <LocationManager warehouses={warehouses} permissions={permissions.locations} />
    </div>
  );
}
