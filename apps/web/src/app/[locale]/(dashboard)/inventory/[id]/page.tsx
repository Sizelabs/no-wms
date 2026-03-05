import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { DtDd, InfoCard, Section } from "@/components/ui/detail-page";
import { getWarehouseReceipt } from "@/lib/actions/warehouse-receipts";
import { requirePermission } from "@/lib/auth/require-permission";

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-50 text-blue-700",
  in_warehouse: "bg-green-50 text-green-700",
  in_work_order: "bg-yellow-50 text-yellow-700",
  in_dispatch: "bg-purple-50 text-purple-700",
  dispatched: "bg-gray-100 text-gray-600",
  damaged: "bg-red-50 text-red-700",
  abandoned: "bg-gray-200 text-gray-500",
};

function storageDays(receivedAt: string): number {
  return Math.floor((Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function WrDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "inventory", "read");
  const { from } = await searchParams;
  const { data: wr, error } = await getWarehouseReceipt(id);

  if (error || !wr) {
    notFound();
  }

  const days = storageDays(wr.received_at);

  return (
    <div className="space-y-6">
      <PageHeader title={`WR ${wr.wr_number}`}>
        <Link
          href={from === "history" ? `/${locale}/history` : `/${locale}/inventory`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {from === "history" ? "Volver al historial" : "Volver al inventario"}
        </Link>
      </PageHeader>

      {/* Status + key info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Estado">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[wr.status] ?? "bg-gray-100"}`}>
            {WR_STATUS_LABELS[wr.status as WrStatus] ?? wr.status}
          </span>
        </InfoCard>
        <InfoCard label="Guía">
          <span className="font-mono text-sm">
            {wr.packages?.[0]?.tracking_number ?? "—"}
            {(wr.packages?.length ?? 0) > 1 && (
              <span className="ml-1 text-xs text-gray-400">(+{(wr.packages?.length ?? 0) - 1})</span>
            )}
          </span>
        </InfoCard>
        <InfoCard label="Agencia">
          {wr.agencies ? `${wr.agencies.name} (${wr.agencies.code})` : "—"}
        </InfoCard>
        <InfoCard label="Días en bodega">
          <span className={days > 60 ? "text-red-600 font-medium" : days > 30 ? "text-yellow-600" : ""}>
            {days} días
          </span>
        </InfoCard>
      </div>

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: info */}
        <div className="space-y-6">
          {/* Weight & dimensions (aggregates) */}
          <Section title="Peso y dimensiones">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DtDd label="Peso real total" value={wr.total_actual_weight_lb ? `${wr.total_actual_weight_lb} lb` : "—"} />
              <DtDd label="Peso vol. total" value={wr.total_volumetric_weight_lb ? `${Number(wr.total_volumetric_weight_lb).toFixed(2)} lb` : "—"} />
              <DtDd label="Peso facturable" value={wr.total_billable_weight_lb ? `${Number(wr.total_billable_weight_lb).toFixed(2)} lb` : "—"} />
              <DtDd label="Peso facturable (Kg)" value={wr.total_billable_weight_lb ? `${(Number(wr.total_billable_weight_lb) * 0.453592).toFixed(2)} kg` : "—"} />
              <DtDd label="Paquetes" value={String(wr.total_packages ?? wr.packages?.length ?? 0)} />
              {wr.total_declared_value_usd != null && (
                <DtDd label="Valor declarado total" value={`$${Number(wr.total_declared_value_usd).toFixed(2)}`} />
              )}
            </dl>
          </Section>

          {/* Per-package details */}
          {wr.packages && wr.packages.length > 0 && (
            <Section title={`Paquetes (${wr.packages.length})`}>
              <div className="space-y-3">
                {wr.packages.map((pkg: { id: string; tracking_number: string; carrier: string | null; actual_weight_lb: number | null; billable_weight_lb: number | null; length_in: number | null; width_in: number | null; height_in: number | null; sender_name: string | null; pieces_count: number; is_damaged: boolean; damage_description: string | null; is_dgr: boolean; dgr_class: string | null; package_type: string | null; declared_value_usd: number | null }) => (
                  <div key={pkg.id} className="rounded-md border p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs font-medium">{pkg.tracking_number}</span>
                      <span className="text-xs text-gray-500">{pkg.carrier ?? "—"}</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <DtDd label="Peso" value={pkg.actual_weight_lb ? `${pkg.actual_weight_lb} lb` : "—"} />
                      <DtDd label="Facturable" value={pkg.billable_weight_lb ? `${Number(pkg.billable_weight_lb).toFixed(2)} lb` : "—"} />
                      <DtDd label="Dimensiones" value={
                        pkg.length_in && pkg.width_in && pkg.height_in
                          ? `${pkg.length_in} × ${pkg.width_in} × ${pkg.height_in} in`
                          : "—"
                      } />
                      <DtDd label="Piezas" value={String(pkg.pieces_count)} />
                      {pkg.package_type && <DtDd label="Tipo" value={pkg.package_type} />}
                      {pkg.sender_name && <DtDd label="Remitente" value={pkg.sender_name} />}
                      {pkg.declared_value_usd != null && <DtDd label="Valor declarado" value={`$${Number(pkg.declared_value_usd).toFixed(2)}`} />}
                    </dl>
                    {pkg.is_damaged && (
                      <div className="mt-2 rounded bg-red-50 p-1.5 text-xs text-red-700">
                        Dañado: {pkg.damage_description ?? "Sin descripción"}
                      </div>
                    )}
                    {pkg.is_dgr && (
                      <div className="mt-1 rounded bg-orange-50 p-1.5 text-xs text-orange-700">
                        DGR{pkg.dgr_class ? ` — Clase ${pkg.dgr_class}` : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recipient & details */}
          <Section title="Detalles">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DtDd label="Destinatario" value={wr.consignees?.full_name ?? "Sin asignar"} />
              <DtDd label="Recibido" value={new Date(wr.received_at).toLocaleString("es")} />
              {wr.has_damaged_package && (
                <div className="col-span-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
                  <span className="font-medium">Contiene paquete(s) dañado(s)</span>
                </div>
              )}
              {wr.has_dgr_package && (
                <div className="col-span-2 rounded-md bg-orange-50 p-2 text-sm text-orange-700">
                  Contiene mercancía peligrosa (DGR)
                </div>
              )}
              {wr.notes && (
                <div className="col-span-2">
                  <dt className="text-xs text-gray-500">Notas</dt>
                  <dd className="mt-0.5 text-gray-700">{wr.notes}</dd>
                </div>
              )}
            </dl>
          </Section>
        </div>

        {/* Right column: photos, history, notes */}
        <div className="space-y-6">
          {/* Photos */}
          <Section title={`Fotos (${wr.wr_photos?.length ?? 0})`}>
            {wr.wr_photos?.length ? (
              <div className="grid grid-cols-3 gap-2">
                {wr.wr_photos.map((photo: { id: string; storage_path: string; file_name: string; is_damage_photo: boolean }) => (
                  <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border">
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/wr-photos/${photo.storage_path}`}
                      alt={photo.file_name}
                      className="h-full w-full object-cover"
                    />
                    {photo.is_damage_photo && (
                      <span className="absolute bottom-1 left-1 rounded bg-red-600 px-1 py-0.5 text-[10px] text-white">
                        Daño
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin fotos</p>
            )}
          </Section>

          {/* Status history */}
          <Section title="Historial de estados">
            {wr.wr_status_history?.length ? (
              <div className="space-y-2">
                {wr.wr_status_history
                  .sort((a: { created_at: string }, b: { created_at: string }) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((entry: { id: string; old_status: string | null; new_status: string; created_at: string; reason: string | null; profiles: { full_name: string } | null }) => (
                    <div key={entry.id} className="flex items-start gap-2 text-sm">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-gray-300" />
                      <div className="flex-1">
                        <span className="font-medium">
                          {WR_STATUS_LABELS[entry.new_status as WrStatus] ?? entry.new_status}
                        </span>
                        {entry.old_status && (
                          <span className="text-gray-400">
                            {" "}← {WR_STATUS_LABELS[entry.old_status as WrStatus] ?? entry.old_status}
                          </span>
                        )}
                        {entry.reason && (
                          <p className="text-xs text-gray-500">{entry.reason}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(entry.created_at).toLocaleString("es")}
                          {entry.profiles?.full_name && ` — ${entry.profiles.full_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin historial</p>
            )}
          </Section>

          {/* Notes */}
          <Section title="Notas del recibo">
            {wr.wr_notes?.length ? (
              <div className="space-y-2">
                {wr.wr_notes.map((note: { id: string; content: string; created_at: string; profiles: { full_name: string } | null }) => (
                  <div key={note.id} className="rounded-md border p-2 text-sm">
                    <p>{note.content}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(note.created_at).toLocaleString("es")}
                      {note.profiles?.full_name && ` — ${note.profiles.full_name}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin notas adicionales</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

