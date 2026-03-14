import { PageHeader } from "@/components/layout/page-header";
import { ShipmentsPageContent } from "@/components/shipments/shipments-page-content";
import { getShipments } from "@/lib/actions/shipments";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ShipmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "shipments", "read");

  const shipmentsResult = await getShipments();
  const canCreate = permissions.shipments.create;

  return (
    <div className="space-y-6">
      <PageHeader title="Embarques" />
      <ShipmentsPageContent
        shipments={shipmentsResult.data ?? []}
        canCreate={canCreate}
      />
    </div>
  );
}
