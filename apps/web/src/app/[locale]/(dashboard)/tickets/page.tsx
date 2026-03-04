import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { TicketList } from "@/components/tickets/ticket-list";
import { getTickets } from "@/lib/actions/tickets";
import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export default async function TicketsPage() {
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

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")}>
        <Link
          href="/tickets/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + {t("new")}
        </Link>
      </PageHeader>
      <TicketList data={tickets as never[]} agencies={agencies} />
    </div>
  );
}
