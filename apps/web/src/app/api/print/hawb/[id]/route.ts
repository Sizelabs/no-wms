import { NextResponse, type NextRequest } from "next/server";

import { getHawbForPrint } from "@/lib/actions/shipping-instructions";
import { stampHawbPdf } from "@/lib/pdf/awb-stamper-v2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: si, settings, org } = await getHawbForPrint(id);

  if (!si || !settings) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBytes = await stampHawbPdf({ si: si as Parameters<typeof stampHawbPdf>[0]["si"], settings, org });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="HAWB-${si.hawbs?.[0]?.hawb_number ?? id}.pdf"`,
    },
  });
}
