import { notFound } from "next/navigation";

import { MawbPrintDocument } from "@/components/shipments/mawb-print-document";
import { getMawbForPrint } from "@/lib/actions/shipments";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function MawbPrintPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "shipments", "read");

  const { data: shipment, settings, org } = await getMawbForPrint(id);

  if (!shipment || !settings) {
    notFound();
  }

  return (
    <div className="print:p-0">
      <MawbPrintDocument shipment={shipment} settings={settings} org={org} />
    </div>
  );
}
