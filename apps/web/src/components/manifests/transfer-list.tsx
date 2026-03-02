"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { approveTransferRequest, rejectTransferRequest } from "@/lib/actions/manifests";

interface Transfer {
  id: string;
  status: string;
  created_at: string;
  from_agency: { name: string; code: string } | null;
  to_agency: { name: string; code: string } | null;
  warehouse_receipts: { wr_number: string; packages: { tracking_number: string }[] } | null;
}

interface TransferListProps {
  data: Transfer[];
  agencies?: Array<{ id: string; name: string; code: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export function TransferList({ data }: TransferListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleApprove = (id: string) => {
    startTransition(async () => {
      await approveTransferRequest(id);
      router.refresh();
    });
  };

  const handleReject = (id: string) => {
    const reason = prompt("Razón de rechazo:");
    if (!reason?.trim()) return;
    startTransition(async () => {
      await rejectTransferRequest(id, reason);
      router.refresh();
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">WR</th>
            <th className="px-4 py-3">De</th>
            <th className="px-4 py-3">A</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-3 font-mono text-xs">
                {t.warehouse_receipts?.wr_number ?? "—"}
                <span className="ml-1 text-gray-400">{t.warehouse_receipts?.packages?.[0]?.tracking_number}</span>
              </td>
              <td className="px-4 py-3 text-xs">
                {t.from_agency ? `${t.from_agency.name} (${t.from_agency.code})` : "—"}
              </td>
              <td className="px-4 py-3 text-xs">
                {t.to_agency ? `${t.to_agency.name} (${t.to_agency.code})` : "—"}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? ""}`}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {new Date(t.created_at).toLocaleDateString("es")}
              </td>
              <td className="px-4 py-3">
                {t.status === "pending" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleApprove(t.id)}
                      disabled={isPending}
                      className="rounded border px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleReject(t.id)}
                      disabled={isPending}
                      className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay solicitudes de transferencia
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
