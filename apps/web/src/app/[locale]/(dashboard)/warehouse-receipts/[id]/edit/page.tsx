import { notFound } from "next/navigation";

import { WrEditableDocument } from "@/components/warehouse/wr-editable-document";
import {
  getAgencyHomeDestination,
  getOrgMembers,
  getWarehouseLocationsForWarehouse,
  getWarehouseReceiptForPrint,
} from "@/lib/actions/warehouse-receipts";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function WrEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "inventory", "update");
  const { from } = await searchParams;

  const { data: wr, settings, org } = await getWarehouseReceiptForPrint(id);

  if (!wr || !settings) {
    notFound();
  }

  const [destination, warehouseLocations, orgMembers] = await Promise.all([
    wr.agency_id ? getAgencyHomeDestination(wr.agency_id) : Promise.resolve(null),
    wr.warehouse_id ? getWarehouseLocationsForWarehouse(wr.warehouse_id) : Promise.resolve([]),
    getOrgMembers(),
  ]);

  const backHref = from === "history"
    ? `/${locale}/history`
    : from === "inventory"
      ? `/${locale}/inventory`
      : `/${locale}/warehouse-receipts`;

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] overflow-hidden bg-gray-50 print:m-0 print:h-auto print:overflow-visible print:bg-white">
      <WrEditableDocument
        wr={wr}
        settings={settings}
        destination={destination}
        org={org}
        warehouseLocations={warehouseLocations}
        orgMembers={orgMembers}
        locale={locale}
        backHref={backHref}
      />
    </div>
  );
}
