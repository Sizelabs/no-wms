import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";

export default async function DestinationsPage() {
  const t = await getTranslations("settingsNav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("destinations")} />
      <div className="rounded-lg border bg-white p-12 text-center">
        <p className="text-sm text-gray-500">Coming soon</p>
      </div>
    </div>
  );
}
