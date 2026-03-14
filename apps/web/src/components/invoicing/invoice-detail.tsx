"use client";

import {
  INVOICE_LINE_ITEM_TYPE_LABELS,
} from "@no-wms/shared/constants/statuses";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { InvoiceStatusBadge } from "@/components/invoicing/invoice-status-badge";
import { useNotification } from "@/components/layout/notification";
import { updateInvoiceStatus, voidInvoice } from "@/lib/actions/invoices";
import { formatDate } from "@/lib/format";

interface LineItem {
  id: string;
  type: string;
  description: string;
  warehouse_receipt_id: string | null;
  work_order_id: string | null;
  shipping_instruction_id: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  warehouse_receipts: { wr_number: string } | null;
  work_orders: { wo_number: string } | null;
  shipping_instructions: { si_number: string } | null;
}

interface InvoiceDetailProps {
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    period_start: string;
    period_end: string;
    subtotal: number;
    tax: number;
    total: number;
    due_date: string | null;
    paid_at: string | null;
    notes: string | null;
    created_at: string;
    agencies: { name: string; code: string } | null;
    invoice_line_items: LineItem[];
  };
}

const TYPE_COLORS: Record<string, string> = {
  shipping: "bg-blue-100 text-blue-700",
  storage: "bg-amber-100 text-amber-700",
  work_order: "bg-purple-100 text-purple-700",
  surcharge: "bg-red-100 text-red-700",
  other: "bg-gray-100 text-gray-700",
};

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoice.id, newStatus);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify(`Estado actualizado a ${newStatus}`, "success");
        router.refresh();
      }
    });
  };

  const handleVoid = () => {
    const reason = prompt("Razón de anulación:");
    if (!reason) return;
    startTransition(async () => {
      const result = await voidInvoice(invoice.id, reason);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Factura anulada", "success");
        router.refresh();
      }
    });
  };

  const getReference = (item: LineItem) => {
    if (item.warehouse_receipts) return item.warehouse_receipts.wr_number;
    if (item.work_orders) return item.work_orders.wo_number;
    if (item.shipping_instructions) return item.shipping_instructions.si_number;
    return "—";
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Factura {invoice.invoice_number}
            </h2>
            <p className="text-sm text-gray-500">
              {invoice.agencies?.name} ({invoice.agencies?.code})
            </p>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="font-medium text-gray-500">Periodo</dt>
            <dd className="mt-0.5 text-gray-900">
              {formatDate(invoice.period_start)} —{" "}
              {formatDate(invoice.period_end)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Creada</dt>
            <dd className="mt-0.5 text-gray-900">
              {formatDate(invoice.created_at)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Vencimiento</dt>
            <dd className="mt-0.5 text-gray-900">
              {invoice.due_date ? formatDate(invoice.due_date) : "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Pagada</dt>
            <dd className="mt-0.5 text-gray-900">
              {invoice.paid_at ? formatDate(invoice.paid_at) : "—"}
            </dd>
          </div>
        </dl>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Impuesto</span>
              <span>${Number(invoice.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Total</span>
              <span>${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-4 rounded bg-gray-50 p-3 text-sm text-gray-600">
            <span className="font-medium">Notas:</span> {invoice.notes}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2 border-t pt-4">
          {invoice.status === "draft" && (
            <button
              onClick={() => handleStatusChange("sent")}
              disabled={isPending}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Enviar
            </button>
          )}
          {invoice.status === "sent" && (
            <button
              onClick={() => handleStatusChange("paid")}
              disabled={isPending}
              className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Marcar Pagada
            </button>
          )}
          {(invoice.status === "draft" || invoice.status === "sent") && (
            <button
              onClick={handleVoid}
              disabled={isPending}
              className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Anular
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Imprimir
          </button>
        </div>
      </div>

      {/* Line items table */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Detalle de Líneas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Referencia</th>
                <th className="px-4 py-2 text-right">Cantidad</th>
                <th className="px-4 py-2 text-right">P. Unitario</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.invoice_line_items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[item.type] ?? ""}`}
                    >
                      {INVOICE_LINE_ITEM_TYPE_LABELS[item.type as keyof typeof INVOICE_LINE_ITEM_TYPE_LABELS] ?? item.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">{item.description}</td>
                  <td className="px-4 py-2 font-mono text-xs">{getReference(item)}</td>
                  <td className="px-4 py-2 text-right text-xs">{Number(item.quantity).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-xs">${Number(item.unit_price).toFixed(4)}</td>
                  <td className="px-4 py-2 text-right text-xs font-medium">
                    ${Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
              {!invoice.invoice_line_items?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-gray-400">
                    No hay líneas en esta factura
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
