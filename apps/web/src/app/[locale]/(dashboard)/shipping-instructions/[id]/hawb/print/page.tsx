import { notFound } from "next/navigation";

import { HawbPrintDocument } from "@/components/shipping/hawb-print-document";
import { getHawbForPrint } from "@/lib/actions/shipping-instructions";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function HawbPrintPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "shipping", "read");

  const { data: si, settings, org } = await getHawbForPrint(id);

  if (!si || !settings) {
    notFound();
  }

  return (
    <div className="print:p-0">
      <HawbPrintDocument si={si} settings={settings} org={org} />
    </div>
  );
}
