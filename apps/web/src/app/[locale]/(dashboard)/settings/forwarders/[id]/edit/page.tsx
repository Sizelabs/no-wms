import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForwarderEditForm } from "@/components/forwarders/forwarder-edit-form";
import { PageHeader } from "@/components/layout/page-header";
import { getOrganization } from "@/lib/actions/organizations";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ForwarderEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "forwarders", "update");
  const t = await getTranslations("nav");

  const { data: forwarder } = await getOrganization(id);
  if (!forwarder) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("forwarders")} — Editar`} />
      <ForwarderEditForm forwarder={forwarder} />
    </div>
  );
}
