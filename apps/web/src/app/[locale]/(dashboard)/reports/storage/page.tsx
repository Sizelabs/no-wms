"use client";

import { useState, useTransition } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ReportFilters } from "@/components/reports/report-filters";
import { StorageReportTable } from "@/components/reports/storage-report-table";
import { getStorageReport } from "@/lib/actions/reports";

export default function StorageReportPage() {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<unknown[]>([]);
  const [loaded, setLoaded] = useState(false);

  const handleFilter = (filters: { agency_id?: string; warehouse_id?: string }) => {
    startTransition(async () => {
      const result = await getStorageReport(filters);
      setData(result.data);
      setLoaded(true);
    });
  };

  if (!loaded && !isPending) {
    handleFilter({});
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reporte de Almacenaje" />
      <ReportFilters showWarehouse onFilter={handleFilter} />
      {isPending && <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>}
      {!isPending && loaded && (
        <StorageReportTable data={data as never[]} />
      )}
    </div>
  );
}
