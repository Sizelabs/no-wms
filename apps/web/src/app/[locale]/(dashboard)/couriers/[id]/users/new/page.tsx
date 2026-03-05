import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { InviteCourierUserForm } from "@/components/users/invite-courier-user-form";
import { getCourier } from "@/lib/actions/couriers";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function CourierInviteUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "users", "create");

  const { data: courier } = await getCourier(id);
  if (!courier) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitar Usuario"
        description={`Courier: ${courier.name}`}
      />
      <InviteCourierUserForm
        organizationId={courier.organization_id}
        courierId={courier.id}
      />
    </div>
  );
}
