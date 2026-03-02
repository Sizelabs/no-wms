"use client";

import { InvoiceStatusBadge } from "@/components/invoicing/invoice-status-badge";

interface BillingData {
  outstandingBalance: number;
  pendingCount: number;
  recentInvoices: Array<{
    id: string;
    invoice_number: string;
    status: string;
    total: number;
    due_date: string | null;
    period_start: string;
    period_end: string;
  }>;
  paymentHistory: Array<{
    id: string;
    invoice_number: string;
    total: number;
    paid_at: string | null;
  }>;
}

interface AgencyBillingSummaryProps {
  data: BillingData;
}

export function AgencyBillingSummary({ data }: AgencyBillingSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Saldo pendiente</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${data.outstandingBalance.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Facturas pendientes</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{data.pendingCount}</p>
        </div>
      </div>

      {/* Recent invoices */}
      {data.recentInvoices.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Facturas recientes</h3>
          <div className="space-y-2">
            {data.recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{inv.invoice_number}</span>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <span className="font-medium">${Number(inv.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      {data.paymentHistory.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Pagos recientes</h3>
          <div className="space-y-2">
            {data.paymentHistory.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-xs">{inv.invoice_number}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("es") : ""}
                  </span>
                </div>
                <span className="font-medium text-green-700">${Number(inv.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
