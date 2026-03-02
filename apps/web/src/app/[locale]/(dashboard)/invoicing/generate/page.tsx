import { redirect } from "next/navigation";

import { InvoiceGenerateForm } from "@/components/invoicing/invoice-generate-form";
import { PageHeader } from "@/components/layout/page-header";
import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function GenerateInvoicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const agencyScope = await getUserAgencyScope();

  let agenciesQuery = supabase
    .from("agencies")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (agencyScope !== null && agencyScope.length > 0) {
    agenciesQuery = agenciesQuery.in("id", agencyScope);
  }

  const agenciesResult =
    agencyScope !== null && agencyScope.length === 0
      ? { data: [] }
      : await agenciesQuery;

  return (
    <div className="space-y-6">
      <PageHeader title="Generar Factura" />
      <InvoiceGenerateForm agencies={agenciesResult.data ?? []} />
    </div>
  );
}
