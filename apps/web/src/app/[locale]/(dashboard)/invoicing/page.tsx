import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AgencyBillingSummary } from "@/components/invoicing/agency-billing-summary";
import { InvoiceList } from "@/components/invoicing/invoice-list";
import { PageHeader } from "@/components/layout/page-header";
import { getAgencyBillingDashboard, getInvoices } from "@/lib/actions/invoices";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserAgencyScope } from "@/lib/auth/scope";

export default async function InvoicingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "invoicing", "read");
  const t = await getTranslations("nav");
  const { data } = await getInvoices();
  const agencyScope = await getUserAgencyScope();

  // For agency users, show billing summary
  const isAgencyUser = agencyScope !== null && agencyScope.length > 0;
  const billingData = isAgencyUser
    ? await getAgencyBillingDashboard()
    : null;

  const canCreate = permissions.invoicing.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("invoicing")}>
        {canCreate && (
          <Link
            href="invoicing/generate"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Generar Factura
          </Link>
        )}
      </PageHeader>

      {billingData?.data && (
        <AgencyBillingSummary data={billingData.data} />
      )}

      <InvoiceList data={data ?? []} />
    </div>
  );
}
