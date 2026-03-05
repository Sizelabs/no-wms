import { notFound } from "next/navigation";

import { InvoiceDetail } from "@/components/invoicing/invoice-detail";
import { PageHeader } from "@/components/layout/page-header";
import { getInvoice } from "@/lib/actions/invoices";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "invoicing", "read");
  const { data: invoice, error } = await getInvoice(id);

  if (error || !invoice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Factura ${invoice.invoice_number}`}
        description={invoice.agencies?.name}
      />
      <InvoiceDetail invoice={invoice} />
    </div>
  );
}
