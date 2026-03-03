import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";
import { AgencySettingsPanel } from "@/components/settings/agency-settings-panel";
import { PermissionsLink } from "@/components/settings/permissions-link";
import { SettingsPanel } from "@/components/settings/settings-panel";

export default function SettingsPage() {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings")} />
      <PermissionsLink />
      <AgencySettingsPanel />
      <SettingsPanel />
    </div>
  );
}
