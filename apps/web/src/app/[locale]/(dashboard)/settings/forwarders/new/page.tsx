import { getTranslations } from "next-intl/server";

import { ForwarderCreateForm } from "@/components/forwarders/forwarder-create-form";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function NewForwarderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "forwarders", "create");
  const t = await getTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("forwarders")} — Nuevo`} />
      <ForwarderCreateForm />
    </div>
  );
}
