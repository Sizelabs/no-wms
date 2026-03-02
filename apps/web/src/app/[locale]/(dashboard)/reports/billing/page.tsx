"use client";

import { useState, useTransition } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { BillingReportTable } from "@/components/reports/billing-report-table";
import { ReportFilters } from "@/components/reports/report-filters";
import { getBillingReport } from "@/lib/actions/reports";

export default function BillingReportPage() {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<{
    totalInvoices: number;
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    byStatus: [string, number][];
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const handleFilter = (filters: { agency_id?: string; date_from?: string; date_to?: string }) => {
    startTransition(async () => {
      const result = await getBillingReport(filters);
      setData(result.data);
      setSummary(result.summary);
      setLoaded(true);
    });
  };

  if (!loaded && !isPending) {
    handleFilter({});
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reporte de Facturación" />
      <ReportFilters onFilter={handleFilter} />
      {isPending && <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>}
      {!isPending && loaded && (
        <BillingReportTable data={data as never[]} summary={summary} />
      )}
    </div>
  );
}
