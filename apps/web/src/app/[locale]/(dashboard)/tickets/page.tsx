import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { TicketList } from "@/components/tickets/ticket-list";
import { getTickets } from "@/lib/actions/tickets";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "tickets", "read");
  const t = await getTranslations("tickets");
  const { data: tickets } = await getTickets();
  const agencyScope = await getUserAgencyScope();

  // Load agencies for filter (non-agency users)
  let agencies: Array<{ id: string; name: string }> = [];
  if (agencyScope === null) {
    const supabase = await createClient();
    const { data } = await supabase.from("agencies").select("id, name").order("name");
    agencies = data ?? [];
  }

  const canCreate = permissions.tickets.create;
  const agencyId = agencyScope?.length === 1 ? agencyScope[0] : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <TicketList
        data={tickets as never[]}
        agencies={agencies}
        canCreate={canCreate}
        agencyId={agencyId}
      />
    </div>
  );
}
