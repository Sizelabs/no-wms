import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { TicketList } from "@/components/tickets/ticket-list";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { getTickets } from "@/lib/actions/tickets";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

async function TicketHeader({ locale }: { locale: string }) {
  const { permissions } = await requirePermission(locale, "tickets", "read");
  const t = await getTranslations("tickets");
  const canCreate = permissions.tickets.create;

  return (
    <PageHeader title={t("title")}>
      {canCreate && (
        <Link
          href="/tickets/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + {t("new")}
        </Link>
      )}
    </PageHeader>
  );
}

async function TicketTableSection({ locale }: { locale: string }) {
  await requirePermission(locale, "tickets", "read");
  const [{ data: tickets }, agencyScope] = await Promise.all([
    getTickets(),
    getUserAgencyScope(),
  ]);

  let agencies: Array<{ id: string; name: string }> = [];
  if (agencyScope === null) {
    const supabase = await createClient();
    const { data } = await supabase.from("agencies").select("id, name").order("name");
    agencies = data ?? [];
  }

  return <TicketList data={tickets as never[]} agencies={agencies} />;
}

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageHeaderSkeleton hasButtons />}>
        <TicketHeader locale={locale} />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <TicketTableSection locale={locale} />
      </Suspense>
    </div>
  );
}
