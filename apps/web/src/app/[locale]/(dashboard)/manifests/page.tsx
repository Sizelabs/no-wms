import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";

export default function ManifestsPage() {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("manifests")} />
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">
        Módulo de MAWB/HAWB/Sacas — Phase 1c
      </div>
    </div>
  );
}
