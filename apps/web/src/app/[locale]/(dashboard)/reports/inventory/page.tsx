"use client";

import { useState, useTransition } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { InventoryReportTable } from "@/components/reports/inventory-report-table";
import { ReportFilters } from "@/components/reports/report-filters";
import { getInventoryReport } from "@/lib/actions/reports";

export default function InventoryReportPage() {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<{
    totalWrs: number;
    totalWeight: number;
    totalPieces: number;
    byStatus: [string, number][];
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const handleFilter = (filters: { agency_id?: string; warehouse_id?: string; date_from?: string; date_to?: string }) => {
    startTransition(async () => {
      const result = await getInventoryReport(filters);
      setData(result.data);
      setSummary(result.summary);
      setLoaded(true);
    });
  };

  // Auto-load on first render
  if (!loaded && !isPending) {
    handleFilter({});
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reporte de Inventario" />
      <ReportFilters showWarehouse onFilter={handleFilter} />
      {isPending && <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>}
      {!isPending && loaded && (
        <InventoryReportTable data={data as never[]} summary={summary} />
      )}
    </div>
  );
}
