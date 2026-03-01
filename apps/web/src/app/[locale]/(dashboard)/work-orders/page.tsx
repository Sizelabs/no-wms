import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";

export default function WorkOrdersPage() {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("workOrders")} />
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">
        Módulo de órdenes de trabajo — Phase 1c
      </div>
    </div>
  );
}
