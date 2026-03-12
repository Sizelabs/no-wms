import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ShipmentDetail } from "@/components/shipments/shipment-detail";
import { getShipment } from "@/lib/actions/shipments";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "shipments", "read");

  const { data: shipment } = await getShipment(id);
  if (!shipment) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Embarque ${shipment.shipment_number}`} />
      <ShipmentDetail shipment={shipment} />
    </div>
  );
}
