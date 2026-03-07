import { notFound } from "next/navigation";

import { WrEditableDocument } from "@/components/warehouse/wr-editable-document";
import {
  getAgencyHomeDestination,
  getWarehouseLocationsForWarehouse,
  getWarehouseReceiptForPrint,
} from "@/lib/actions/warehouse-receipts";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function WrEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "inventory", "update");

  const { data: wr, settings, org } = await getWarehouseReceiptForPrint(id);

  if (!wr || !settings) {
    notFound();
  }

  const [destination, warehouseLocations] = await Promise.all([
    wr.agency_id ? getAgencyHomeDestination(wr.agency_id) : Promise.resolve(null),
    wr.warehouse_id ? getWarehouseLocationsForWarehouse(wr.warehouse_id) : Promise.resolve([]),
  ]);

  return (
    <div className="-m-6 flex min-h-[calc(100vh-3.5rem)] flex-col bg-slate-100/80 px-6 pb-6 pt-6 print:m-0 print:bg-white print:p-0">
      <WrEditableDocument
        wr={wr}
        settings={settings}
        destination={destination}
        org={org}
        warehouseLocations={warehouseLocations}
        locale={locale}
      />
    </div>
  );
}
