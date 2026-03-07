import type { ConditionFlag } from "@no-wms/shared/constants/condition-flags";
import {
  CONDITION_FLAG_COLORS,
  CONDITION_FLAG_LABELS_ES,
} from "@no-wms/shared/constants/condition-flags";
import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { DtDd, InfoCard, Section } from "@/components/ui/detail-page";
import { WrDetailActions } from "@/components/warehouse/wr-detail-actions";
import {
  getAgencyHomeDestination,
  getWarehouseReceipt,
} from "@/lib/actions/warehouse-receipts";
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

  // Resolve destination
  const dest = wr.agency_id
    ? await getAgencyHomeDestination(wr.agency_id)
    : null;
  const destLabel = dest ? `${dest.city}, ${dest.country_code}` : null;

  // Resolve courier
  const courier = wr.agencies?.couriers;
  const courierName = courier
    ? Array.isArray(courier) ? courier[0]?.name : courier.name
    : null;

  // Resolve location
  const zone = wr.warehouse_locations?.warehouse_zones;
  const zoneName = zone ? (Array.isArray(zone) ? zone[0]?.name : zone.name) : null;
  const locationLabel = wr.warehouse_locations
    ? `${zoneName ? `${zoneName} / ` : ""}${wr.warehouse_locations.code}`
    : null;

  const backHref = from === "history"
    ? `/${locale}/history`
    : from === "inventory"
      ? `/${locale}/inventory`
      : `/${locale}/warehouse-receipts`;

  const conditionFlags = (wr.condition_flags ?? []) as string[];

  return (
    <div className="space-y-6">
      <PageHeader title={`WR ${wr.wr_number}`}>
        <WrDetailActions wrId={id} locale={locale} backHref={backHref} />
      </PageHeader>

      {/* Summary cards — 2 rows of 4 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Estado">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[wr.status] ?? "bg-gray-100"}`}>
            {WR_STATUS_LABELS[wr.status as WrStatus] ?? wr.status}
          </span>
        </InfoCard>
        <InfoCard label="Guia">
          <span className="font-mono text-sm">
            {wr.packages?.[0]?.tracking_number ?? "\u2014"}
            {(wr.packages?.length ?? 0) > 1 && (
              <span className="ml-1 text-xs text-gray-400">(+{(wr.packages?.length ?? 0) - 1})</span>
            )}
          </span>
        </InfoCard>
        <InfoCard label="Agencia">
          {wr.agencies ? `${wr.agencies.name} (${wr.agencies.code})` : "\u2014"}
        </InfoCard>
        <InfoCard label="Dias en bodega">
          <span className={days > 60 ? "text-red-600 font-medium" : days > 30 ? "text-yellow-600" : ""}>
            {days} dias
          </span>
        </InfoCard>

        <InfoCard label="Courier">
          {courierName ?? "\u2014"}
        </InfoCard>
        <InfoCard label="Bodega">
          {wr.warehouses ? `${wr.warehouses.name} (${wr.warehouses.code})` : "\u2014"}
        </InfoCard>
        <InfoCard label="Destino">
          {destLabel ?? "\u2014"}
        </InfoCard>
        <InfoCard label="Paquetes">
          {String(wr.total_packages ?? wr.packages?.length ?? 0)}
        </InfoCard>
      </div>

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Weight & dimensions */}
          <Section title="Peso y dimensiones">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DtDd label="Peso real total" value={wr.total_actual_weight_lb ? `${wr.total_actual_weight_lb} lb` : "\u2014"} />
              <DtDd label="Peso vol. total" value={wr.total_volumetric_weight_lb ? `${Number(wr.total_volumetric_weight_lb).toFixed(2)} lb` : "\u2014"} />
              <DtDd label="Peso facturable" value={wr.total_billable_weight_lb ? `${Number(wr.total_billable_weight_lb).toFixed(2)} lb` : "\u2014"} />
              <DtDd label="Peso facturable (Kg)" value={wr.total_billable_weight_lb ? `${(Number(wr.total_billable_weight_lb) * 0.453592).toFixed(2)} kg` : "\u2014"} />
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
                {wr.packages.map((pkg: { id: string; tracking_number: string; carrier: string | null; actual_weight_lb: number | null; billable_weight_lb: number | null; length_in: number | null; width_in: number | null; height_in: number | null; sender_name: string | null; pieces_count: number; is_damaged: boolean; damage_description: string | null; is_dgr: boolean; dgr_class: string | null; package_type: string | null; declared_value_usd: number | null }) => {
                  const pkgPhotos = (wr.wr_photos ?? []).filter(
                    (p: { package_id: string | null }) => p.package_id === pkg.id,
                  );
                  return (
                  <div key={pkg.id} className="rounded-md border p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs font-medium">{pkg.tracking_number}</span>
                      <span className="text-xs text-gray-500">{pkg.carrier ?? "\u2014"}</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <DtDd label="Peso" value={pkg.actual_weight_lb ? `${pkg.actual_weight_lb} lb` : "\u2014"} />
                      <DtDd label="Facturable" value={pkg.billable_weight_lb ? `${Number(pkg.billable_weight_lb).toFixed(2)} lb` : "\u2014"} />
                      <DtDd label="Dimensiones" value={
                        pkg.length_in && pkg.width_in && pkg.height_in
                          ? `${pkg.length_in} \u00d7 ${pkg.width_in} \u00d7 ${pkg.height_in} in`
                          : "\u2014"
                      } />
                      <DtDd label="Piezas" value={String(pkg.pieces_count)} />
                      {pkg.package_type && <DtDd label="Tipo" value={pkg.package_type} />}
                      {pkg.sender_name && <DtDd label="Remitente" value={pkg.sender_name} />}
                      {pkg.declared_value_usd != null && <DtDd label="Valor declarado" value={`$${Number(pkg.declared_value_usd).toFixed(2)}`} />}
                    </dl>
                    {pkg.is_damaged && (
                      <div className="mt-2 rounded bg-red-50 p-1.5 text-xs text-red-700">
                        Danado: {pkg.damage_description ?? "Sin descripcion"}
                      </div>
                    )}
                    {pkg.is_dgr && (
                      <div className="mt-1 rounded bg-orange-50 p-1.5 text-xs text-orange-700">
                        DGR{pkg.dgr_class ? ` \u2014 Clase ${pkg.dgr_class}` : ""}
                      </div>
                    )}
                    {pkgPhotos.length > 0 && (
                      <div className="mt-2">
                        <p className="mb-1 text-xs font-medium text-gray-500">Fotos ({pkgPhotos.length})</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {pkgPhotos.map((photo: { id: string; signed_url: string | null; file_name: string; is_damage_photo: boolean }) => (
                            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border">
                              {photo.signed_url ? (
                                <img
                                  src={photo.signed_url}
                                  alt={photo.file_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-gray-50 text-xs text-gray-400">Error</div>
                              )}
                              {photo.is_damage_photo && (
                                <span className="absolute bottom-1 left-1 rounded bg-red-600 px-1 py-0.5 text-[10px] text-white">
                                  Dano
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Details */}
          <Section title="Detalles">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DtDd label="Destinatario" value={wr.consignees?.full_name ?? wr.consignee_name ?? "Sin asignar"} />
              <DtDd label="Recibido" value={new Date(wr.received_at).toLocaleString("es")} />
              <DtDd label="Recibido por" value={wr.profiles?.full_name ?? "\u2014"} />
              <DtDd label="Ubicacion en bodega" value={locationLabel ?? "Sin asignar"} />
              {(wr.content_description ?? wr.description) && (
                <div className="col-span-2">
                  <dt className="text-xs text-gray-500">Contenido declarado</dt>
                  <dd className="mt-0.5 text-gray-700">{wr.content_description ?? wr.description}</dd>
                </div>
              )}
              {wr.shipper_name && <DtDd label="Shipper" value={wr.shipper_name} />}
              {wr.master_tracking && <DtDd label="Master Tracking" value={wr.master_tracking} />}
              {wr.has_damaged_package && (
                <div className="col-span-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
                  <span className="font-medium">Contiene paquete(s) danado(s)</span>
                </div>
              )}
              {wr.has_dgr_package && (
                <div className="col-span-2 rounded-md bg-orange-50 p-2 text-sm text-orange-700">
                  Contiene mercancia peligrosa (DGR)
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

        {/* Right column */}
        <div className="space-y-6">
          {/* Unlinked photos (legacy WRs without package_id) */}
          {(() => {
            const unlinked = (wr.wr_photos ?? []).filter(
              (p: { package_id: string | null }) => !p.package_id,
            );
            return unlinked.length > 0 ? (
              <Section title={`Fotos (${unlinked.length})`}>
                <div className="grid grid-cols-3 gap-2">
                  {unlinked.map((photo: { id: string; signed_url: string | null; file_name: string; is_damage_photo: boolean }) => (
                    <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border">
                      {photo.signed_url ? (
                        <img src={photo.signed_url} alt={photo.file_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gray-50 text-xs text-gray-400">Error</div>
                      )}
                      {photo.is_damage_photo && (
                        <span className="absolute bottom-1 left-1 rounded bg-red-600 px-1 py-0.5 text-[10px] text-white">
                          Dano
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            ) : null;
          })()}

          {/* Attachments */}
          <Section title={`Adjuntos (${wr.wr_attachments?.length ?? 0})`}>
            {wr.wr_attachments?.length ? (
              <ul className="space-y-1.5">
                {wr.wr_attachments.map((att: { id: string; signed_url: string | null; file_name: string }) => (
                  <li key={att.id} className="text-sm">
                    {att.signed_url ? (
                      <a
                        href={att.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {att.file_name}
                      </a>
                    ) : (
                      <span className="text-gray-400">{att.file_name} (no disponible)</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Sin adjuntos</p>
            )}
          </Section>

          {/* Condition on arrival */}
          <Section title="Condicion de ingreso">
            {conditionFlags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {conditionFlags.map((flag) => (
                  <span
                    key={flag}
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${CONDITION_FLAG_COLORS[flag as ConditionFlag] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {CONDITION_FLAG_LABELS_ES[flag as ConditionFlag] ?? flag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin registro</p>
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
                            {" "}\u2190 {WR_STATUS_LABELS[entry.old_status as WrStatus] ?? entry.old_status}
                          </span>
                        )}
                        {entry.reason && (
                          <p className="text-xs text-gray-500">{entry.reason}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(entry.created_at).toLocaleString("es")}
                          {entry.profiles?.full_name && ` \u2014 ${entry.profiles.full_name}`}
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
                      {note.profiles?.full_name && ` \u2014 ${note.profiles.full_name}`}
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
