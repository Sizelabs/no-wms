import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { AgencySettingsPanel } from "@/components/settings/agency-settings-panel";
import { PermissionsLink } from "@/components/settings/permissions-link";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "settings", "read");
  const t = await getTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings")} />
      <PermissionsLink />
      <AgencySettingsPanel />
      <SettingsPanel />
    </div>
  );
}
