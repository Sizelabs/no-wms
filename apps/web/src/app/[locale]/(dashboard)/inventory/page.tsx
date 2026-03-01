import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";

export default function InventoryPage() {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("inventory")} />
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">
        Módulo de inventario — Phase 1b
      </div>
    </div>
  );
}
