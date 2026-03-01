import Link from "next/link";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";

export default function WarehouseReceiptsPage() {
  const t = useTranslations("nav");

  return (
    <div className="space-y-6">
      <PageHeader title={t("warehouseReceipts")}>
        <Link
          href="warehouse-receipts/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Recibir Paquete
        </Link>
      </PageHeader>
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-400">
        Historial de recibos — se mostrará con datos reales
      </div>
    </div>
  );
}
