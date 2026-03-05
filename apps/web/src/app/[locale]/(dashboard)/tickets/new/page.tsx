import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { TicketForm } from "@/components/tickets/ticket-form";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function NewTicketPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "tickets", "create");
  const t = await getTranslations("tickets");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const agencyScope = await getUserAgencyScope();

  // For agency users, get their agency ID
  let agencyId: string | undefined;
  let agencies: Array<{ id: string; name: string; code: string }> = [];

  if (agencyScope !== null && agencyScope.length === 1) {
    agencyId = agencyScope[0];
  } else if (agencyScope === null) {
    // Admin user — load all agencies
    const { data } = await supabase.from("agencies").select("id, name, code").order("name");
    agencies = data ?? [];
  }

  // Load WRs for linking (scoped)
  let wrQuery = supabase
    .from("warehouse_receipts")
    .select("id, wr_number, packages(tracking_number)")
    .in("status", ["in_warehouse", "in_work_order", "in_dispatch", "received"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (agencyScope !== null && agencyScope.length) {
    wrQuery = wrQuery.in("agency_id", agencyScope);
  }

  const { data: wrs } = await wrQuery;

  return (
    <div className="space-y-6">
      <PageHeader title={t("new")} />
      <TicketForm agencies={agencies} agencyId={agencyId} wrs={wrs ?? []} />
    </div>
  );
}
