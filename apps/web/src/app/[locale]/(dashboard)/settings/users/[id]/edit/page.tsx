import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { UserEditForm } from "@/components/users/user-edit-form";
import { getUser } from "@/lib/actions/users";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function UserEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "users", "update");

  const { data: user } = await getUser(id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Usuario — ${user.full_name}`} />
      <UserEditForm user={user} />
    </div>
  );
}
