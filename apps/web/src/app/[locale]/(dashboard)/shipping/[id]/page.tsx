import type { SiStatus } from "@no-wms/shared/constants/statuses";
import { SI_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SiActions } from "@/components/shipping/si-actions";
import { InfoCard, Section } from "@/components/ui/detail-page";
import { getShippingInstruction } from "@/lib/actions/shipping-instructions";
import { requirePermission } from "@/lib/auth/require-permission";

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  finalized: "bg-purple-100 text-purple-800",
  manifested: "bg-indigo-100 text-indigo-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default async function ShippingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "shipping", "read");
  const { data: si, error } = await getShippingInstruction(id);

  if (error || !si) {
    notFound();
  }

  const totalWeight = si.shipping_instruction_items?.reduce(
    (sum: number, item: { warehouse_receipts: { total_billable_weight_lb: number | null } | null }) =>
      sum + (item.warehouse_receipts?.total_billable_weight_lb ? Number(item.warehouse_receipts.total_billable_weight_lb) : 0),
    0,
  ) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title={`Instrucción de Envío ${si.si_number}`}>
        <Link
          href={`/${locale}/shipping`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Volver a envíos
        </Link>
      </PageHeader>

      {/* Status + key info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Estado">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[si.status] ?? ""}`}>
            {SI_STATUS_LABELS[si.status as SiStatus] ?? si.status}
          </span>
        </InfoCard>
        <InfoCard label="Modalidad">
          {si.modality}{si.courier_category ? ` — Cat ${si.courier_category}` : ""}
        </InfoCard>
        <InfoCard label="Agencia">
          {si.agencies ? `${si.agencies.name} (${si.agencies.code})` : "—"}
        </InfoCard>
        <InfoCard label="Piezas / Peso">
          {si.shipping_instruction_items?.length ?? 0} pzs • {totalWeight.toFixed(1)} lb
        </InfoCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Details */}
        <div className="space-y-6">
          <Section title="Detalles">
            <dl className="space-y-2 text-sm">
              <SiDtDd label="Destinatario" value={si.consignees?.name ?? "—"} />
              <SiDtDd label="Cédula/RUC" value={si.cedula_ruc ?? "—"} />
              <SiDtDd label="Cupo 4x4" value={si.cupo_4x4_used ? "Sí" : "No"} />
              <SiDtDd label="Creado" value={new Date(si.created_at).toLocaleString("es")} />
              {si.approved_at && <SiDtDd label="Aprobado" value={new Date(si.approved_at).toLocaleString("es")} />}
              {si.special_instructions && (
                <div>
                  <dt className="text-xs text-gray-500">Instrucciones especiales</dt>
                  <dd className="mt-0.5 rounded-md bg-gray-50 p-2 text-gray-700">{si.special_instructions}</dd>
                </div>
              )}
              {si.rejection_reason && (
                <div>
                  <dt className="text-xs text-gray-500">Razón de rechazo</dt>
                  <dd className="mt-0.5 rounded-md bg-red-50 p-2 text-red-700">{si.rejection_reason}</dd>
                </div>
              )}
            </dl>
          </Section>

          {/* Additional charges */}
          {si.additional_charges && (si.additional_charges as Array<{ description: string; amount: number }>).length > 0 && (
            <Section title="Cargos adicionales">
              <div className="space-y-1 text-sm">
                {(si.additional_charges as Array<{ description: string; amount: number }>).map((c, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-600">{c.description}</span>
                    <span className="font-mono">${c.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* HAWB info */}
          {si.hawbs && (si.hawbs as Array<{ id: string; hawb_number: string; pieces: number; weight_lb: number }>).length > 0 && (
            <Section title="HAWBs">
              {(si.hawbs as Array<{ id: string; hawb_number: string; pieces: number; weight_lb: number }>).map((hawb) => (
                <div key={hawb.id} className="rounded-md border p-2 text-sm">
                  <span className="font-mono font-medium">{hawb.hawb_number}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {hawb.pieces} pzs • {hawb.weight_lb?.toFixed(1)} lb
                  </span>
                </div>
              ))}
            </Section>
          )}
        </div>

        {/* Right: WRs + Actions */}
        <div className="space-y-6">
          <Section title={`WRs incluidos (${si.shipping_instruction_items?.length ?? 0})`}>
            <div className="space-y-1">
              {si.shipping_instruction_items?.map((item: {
                warehouse_receipt_id: string;
                warehouse_receipts: { wr_number: string; total_billable_weight_lb: number | null; packages: { tracking_number: string; carrier: string | null }[] } | null;
              }) => (
                <Link
                  key={item.warehouse_receipt_id}
                  href={`/${locale}/inventory/${item.warehouse_receipt_id}`}
                  className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-gray-50"
                >
                  <div>
                    <span className="font-mono text-xs font-medium">
                      {item.warehouse_receipts?.wr_number ?? "—"}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {item.warehouse_receipts?.packages?.[0]?.tracking_number ?? ""}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {item.warehouse_receipts?.total_billable_weight_lb ? Number(item.warehouse_receipts.total_billable_weight_lb).toFixed(1) : "—"} lb
                  </span>
                </Link>
              ))}
            </div>
          </Section>

          <SiActions siId={si.id} status={si.status} />
        </div>
      </div>
    </div>
  );
}

function SiDtDd({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-700">{value}</dd>
    </div>
  );
}
