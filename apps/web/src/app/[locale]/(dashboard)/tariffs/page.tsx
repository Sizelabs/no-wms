import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";

export default function TariffsPage() {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("tariffs")} />
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">
        Módulo de tarifas — Phase 1d
      </div>
    </div>
  );
}
