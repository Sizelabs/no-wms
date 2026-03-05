import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForwarderEditForm } from "@/components/forwarders/forwarder-edit-form";
import { PageHeader } from "@/components/layout/page-header";
import { getOrganization } from "@/lib/actions/organizations";

export default async function ForwarderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
