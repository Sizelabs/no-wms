import { notFound } from "next/navigation";

import { WrPrintDocument } from "@/components/warehouse/wr-print-document";
import {
  getAgencyHomeDestination,
  getWarehouseReceiptForPrint,
} from "@/lib/actions/warehouse-receipts";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function WrPrintPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "inventory", "read");

  const { data: wr, settings, org } = await getWarehouseReceiptForPrint(id);

  if (!wr || !settings) {
    notFound();
  }

  const destination = wr.agency_id
    ? await getAgencyHomeDestination(wr.agency_id)
    : null;

  return (
    <div className="print:p-0">
      <WrPrintDocument
        wr={wr}
        settings={settings}
        destination={destination}
        org={org}
      />
    </div>
  );
}
