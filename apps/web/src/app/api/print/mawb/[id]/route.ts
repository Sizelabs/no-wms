import { NextResponse, type NextRequest } from "next/server";

import { getMawbForPrint } from "@/lib/actions/shipments";
import { stampMawbPdf } from "@/lib/pdf/awb-stamper-v2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: shipment, settings, org } = await getMawbForPrint(id);

  if (!shipment || !settings) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBytes = await stampMawbPdf({
    shipment: shipment as Parameters<typeof stampMawbPdf>[0]["shipment"],
    settings,
    org,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="MAWB-${shipment.awb_number ?? id}.pdf"`,
    },
  });
}
