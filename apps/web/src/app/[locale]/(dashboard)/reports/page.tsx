import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { ReportCard } from "@/components/reports/report-card";

export default async function ReportsPage() {
  const t = await getTranslations("reports");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportCard
          title="Inventario"
          description="WRs por agencia, estado y bodega"
          href="/reports/inventory"
        />
        <ReportCard
          title="Embarques"
          description="Instrucciones de embarque, pesos y destinos"
          href="/reports/shipping"
        />
        <ReportCard
          title="Facturación"
          description="Facturas, cobros y saldos pendientes"
          href="/reports/billing"
        />
        <ReportCard
          title="Almacenaje"
          description="Días en bodega y alertas de almacenaje"
          href="/reports/storage"
        />
      </div>
    </div>
  );
}
