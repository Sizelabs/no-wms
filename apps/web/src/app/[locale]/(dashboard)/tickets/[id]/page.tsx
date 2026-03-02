import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { TicketDetail } from "@/components/tickets/ticket-detail";
import { getTicket } from "@/lib/actions/tickets";
import { getUserAgencyScope } from "@/lib/auth/scope";

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { id } = await params;
  const { data: ticket, error } = await getTicket(id);

  if (error || !ticket) notFound();

  // Agency users can only reply, not manage status
  const agencyScope = await getUserAgencyScope();
  const canManage = agencyScope === null; // admins can manage

  return (
    <div className="space-y-6">
      <PageHeader title={`Ticket ${ticket.ticket_number}`} />
      <TicketDetail ticket={ticket as never} canManage={canManage} />
    </div>
  );
}
