import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";

export default function TicketsPage() {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("tickets")} />
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">
        Módulo de tickets — Phase 1e
      </div>
    </div>
  );
}
