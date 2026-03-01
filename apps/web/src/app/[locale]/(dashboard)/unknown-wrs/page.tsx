import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";

export default function UnknownWrsPage() {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("unknownWrs")} />
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">
        Cola de WR desconocidos — Phase 1b
      </div>
    </div>
  );
}
