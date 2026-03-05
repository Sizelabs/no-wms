import type { ReactNode } from "react";

import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex gap-8">
      <SettingsSidebar locale={locale} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
