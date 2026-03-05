import { getTranslations } from "next-intl/server";

import { ForwarderCreateForm } from "@/components/forwarders/forwarder-create-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function NewForwarderPage() {
  const t = await getTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("forwarders")} — Nuevo`} />
      <ForwarderCreateForm />
    </div>
  );
}
