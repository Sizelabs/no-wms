"use client";

import type { SiStatus } from "@no-wms/shared/constants/statuses";
import { SI_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import { FORWARDER_SIDE_ROLES, ROLES } from "@no-wms/shared/constants/roles";
import { ExternalLink, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { SiRejectModal } from "@/components/shipping/si-reject-modal";
import { InfoField } from "@/components/ui/info-field";
import { Sheet, SheetBody, SheetHeader, SheetToolbar } from "@/components/ui/sheet";
import {
  approveShippingInstruction,
  finalizeShippingInstruction,
  rejectShippingInstruction,
} from "@/lib/actions/shipping-instructions";
import { formatDate } from "@/lib/format";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  finalized: "bg-purple-100 text-purple-800",
  manifested: "bg-indigo-100 text-indigo-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

interface HouseBill {
  id: string;
  hawb_number: string;
  document_type: string;
  pieces?: number | null;
  weight_lb?: number | null;
}

export interface SiDetailData {
  id: string;
  si_number: string;
  modality: string;
  modalities: { id: string; name: string; code: string } | null;
  status: string;
  agency_id: string | null;
  destination_id: string | null;
  total_pieces: number | null;
  total_billable_weight_lb: number | null;
  total_declared_value_usd: number | null;
  created_at: string;
  approved_at: string | null;
  cedula_ruc: string | null;
  cupo_4x4_used: boolean | null;
  special_instructions: string | null;
  rejection_reason: string | null;
  insure_cargo: boolean | null;
  is_dgr: boolean | null;
  courier_category: string | null;
  category_snapshot: unknown;
  agencies: { name: string; code: string } | null;
  consignees: { full_name: string } | null;
  hawbs: HouseBill[];
  shipping_instruction_items: {
    warehouse_receipt_id: string;
    warehouse_receipts: {
      wr_number: string;
      total_billable_weight_lb: number | null;
      packages: { tracking_number: string; carrier: string | null }[];
    } | null;
  }[];
  shipping_categories?: { code: string; name: string } | null;
  additional_charges?: Array<{ description: string; amount: number }> | null;
}

interface SiDetailSheetProps {
  open: boolean;
  onClose: () => void;
  si: SiDetailData | null;
}

export function SiDetailSheet({ open, onClose, si }: SiDetailSheetProps) {
  const { locale } = useParams<{ locale: string }>();
  const { notify } = useNotification();
  const t = useTranslations("shipping");
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);

  const roles = useUserRoles();
  const isDestinationAdmin = roles.includes(ROLES.DESTINATION_ADMIN);
  const isForwarderSide = roles.some((r) => (FORWARDER_SIDE_ROLES as readonly string[]).includes(r));

  const totalWeight = si
    ? (si.total_billable_weight_lb
      ?? si.shipping_instruction_items.reduce(
        (s, i) => s + Number(i.warehouse_receipts?.total_billable_weight_lb ?? 0),
        0,
      ))
      || null
    : null;

  const handleApprove = () => {
    if (!si) return;
    startTransition(async () => {
      const result = await approveShippingInstruction(si.id);
      if (result.error) notify(result.error, "error");
      else notify(t("approvedSuccess"), "success");
    });
  };

  const handleReject = (reason: string) => {
    if (!si) return;
    startTransition(async () => {
      const result = await rejectShippingInstruction(si.id, reason);
      if (result.error) notify(result.error, "error");
      else { setRejectOpen(false); notify(t("rejectedSuccess"), "success"); }
    });
  };

  const handleFinalize = () => {
    if (!si) return;
    startTransition(async () => {
      const result = await finalizeShippingInstruction(si.id);
      if (result.error) notify(result.error, "error");
      else notify(t("finalizedSuccess"), "success");
    });
  };

  const categorySnapshot = si?.category_snapshot as { code?: string; name?: string; cargo_type?: string; customs_declaration_type?: string } | null;

  return (
    <>
      <Sheet open={open} onClose={onClose}>
        <SheetHeader onClose={onClose}>
          {si ? `SI ${si.si_number}` : "Detalle"}
        </SheetHeader>

        {si && (
          <SheetToolbar>
            {/* Left: status + modality badges */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[si.status] ?? ""}`}>
                {SI_STATUS_LABELS[si.status as SiStatus] ?? si.status}
              </span>
              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {si.modalities?.name ?? si.modality}
              </span>
            </div>

            <div className="flex-1" />

            {/* Right: actions */}
            <div className="flex items-center gap-1">
              {si.status === "requested" && isDestinationAdmin && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={isPending}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {isPending ? "..." : t("approve")}
                  </button>
                  <button
                    onClick={() => setRejectOpen(true)}
                    disabled={isPending}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {t("reject")}
                  </button>
                </>
              )}
              {si.status === "approved" && isForwarderSide && (
                <button
                  onClick={handleFinalize}
                  disabled={isPending}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  {isPending ? "..." : t("finalize")}
                </button>
              )}

              {si.hawbs.length > 0 && (
                <Link
                  href={`/api/print/hawb/${si.id}`}
                  target="_blank"
                  title="Imprimir HAWB"
                  className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-700"
                >
                  <Printer className="size-4" />
                </Link>
              )}

              <div className="mx-0.5 h-5 w-px bg-gray-300/60" />

              <Link
                href={`/${locale}/shipping-instructions/${si.id}`}
                onClick={onClose}
                title="Abrir pagina completa"
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-700"
              >
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </SheetToolbar>
        )}

        <SheetBody>
          {si && (
            <div className="space-y-5">
              {/* General info */}
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoField label="Agencia" value={si.agencies ? `${si.agencies.name} (${si.agencies.code})` : null} />
                <InfoField label="Consignatario" value={si.consignees?.full_name} />
                <InfoField label="Modalidad" value={si.modalities?.name ?? si.modality} />
                {categorySnapshot?.code && (
                  <InfoField label="Categoría" value={`${categorySnapshot.code}: ${categorySnapshot.name ?? ""}`} />
                )}
                <InfoField label="Piezas" value={si.total_pieces ?? si.shipping_instruction_items.length} />
                <InfoField label="Peso" value={totalWeight ? `${Number(totalWeight).toFixed(1)} lb` : null} />
                {si.total_declared_value_usd != null && (
                  <InfoField label="Valor declarado" value={`$${Number(si.total_declared_value_usd).toFixed(2)}`} />
                )}
                <InfoField label="Fecha" value={formatDate(si.created_at)} />
                {si.approved_at && <InfoField label="Aprobada" value={formatDate(si.approved_at)} />}
              </div>

              {/* Ecuador-specific fields */}
              {(si.cedula_ruc || si.cupo_4x4_used != null) && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 text-sm font-medium text-gray-900">Datos aduaneros</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {si.cedula_ruc && <InfoField label="Cedula/RUC" value={si.cedula_ruc} />}
                    {si.cupo_4x4_used != null && <InfoField label="Cupo 4x4" value={si.cupo_4x4_used ? "Si" : "No"} />}
                    {si.insure_cargo != null && <InfoField label="Seguro de carga" value={si.insure_cargo ? "Si" : "No"} />}
                    {si.is_dgr != null && si.is_dgr && <InfoField label="DGR" value="Si" />}
                  </div>
                </div>
              )}

              {/* Special instructions */}
              {si.special_instructions && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 text-sm font-medium text-gray-900">Instrucciones especiales</h3>
                  <p className="rounded-md bg-gray-50 p-2.5 text-sm text-gray-700">{si.special_instructions}</p>
                </div>
              )}

              {/* Rejection reason */}
              {si.rejection_reason && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 text-sm font-medium text-gray-900">Razon de rechazo</h3>
                  <p className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{si.rejection_reason}</p>
                </div>
              )}

              {/* Additional charges */}
              {si.additional_charges && si.additional_charges.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 text-sm font-medium text-gray-900">Cargos adicionales</h3>
                  <div className="space-y-1 text-sm">
                    {si.additional_charges.map((c, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-gray-600">{c.description}</span>
                        <span className="font-mono">${c.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HAWBs */}
              {si.hawbs.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 text-sm font-medium text-gray-900">HAWBs</h3>
                  <div className="overflow-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Pzas</th>
                          <th className="px-3 py-2">Peso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {si.hawbs.map((h) => (
                          <tr key={h.id}>
                            <td className="px-3 py-2 font-mono text-xs">{h.hawb_number}</td>
                            <td className="px-3 py-2 text-xs uppercase">{h.document_type}</td>
                            <td className="px-3 py-2 text-xs">{h.pieces ?? "\u2014"}</td>
                            <td className="px-3 py-2 text-xs">{h.weight_lb ? `${h.weight_lb} lb` : "\u2014"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* WRs */}
              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-medium text-gray-900">
                  WRs incluidos ({si.shipping_instruction_items.length})
                </h3>
                {si.shipping_instruction_items.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay WRs asignados.</p>
                ) : (
                  <div className="space-y-1">
                    {si.shipping_instruction_items.map((item) => (
                      <Link
                        key={item.warehouse_receipt_id}
                        href={`/${locale}/warehouse-receipts/${item.warehouse_receipt_id}/edit`}
                        className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-gray-50"
                      >
                        <div>
                          <span className="font-mono text-xs font-medium">
                            {item.warehouse_receipts?.wr_number ?? "\u2014"}
                          </span>
                          {item.warehouse_receipts?.packages?.[0]?.tracking_number && (
                            <span className="ml-2 text-xs text-gray-500">
                              {item.warehouse_receipts.packages[0].tracking_number}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {item.warehouse_receipts?.total_billable_weight_lb
                            ? `${Number(item.warehouse_receipts.total_billable_weight_lb).toFixed(1)} lb`
                            : "\u2014"}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetBody>
      </Sheet>

      <SiRejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        isPending={isPending}
      />
    </>
  );
}
