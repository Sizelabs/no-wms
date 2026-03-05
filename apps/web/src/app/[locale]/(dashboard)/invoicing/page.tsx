import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function InvoicingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "invoicing", "read");
  const t = await getTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("invoicing")} />
      <div className="rounded-lg border bg-white p-12 text-center">
        <p className="text-sm text-gray-500">Coming soon</p>
      </div>
    </div>
  );
}
