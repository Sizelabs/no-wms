import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { UserEditForm } from "@/components/users/user-edit-form";
import { getUser } from "@/lib/actions/users";

export default async function UserEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: user } = await getUser(id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Usuario — ${user.full_name}`} />
      <UserEditForm user={user} />
    </div>
  );
}
