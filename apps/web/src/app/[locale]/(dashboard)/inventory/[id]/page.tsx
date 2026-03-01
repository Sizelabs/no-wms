import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { getWarehouseReceipt } from "@/lib/actions/warehouse-receipts";

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
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { data: wr, error } = await getWarehouseReceipt(id);

  if (error || !wr) {
    notFound();
  }

  const days = storageDays(wr.received_at);

  return (
    <div className="space-y-6">
      <PageHeader title={`WR ${wr.wr_number}`}>
        <Link
          href={`/${locale}/inventory`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Volver al inventario
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
          <span className="font-mono text-sm">{wr.tracking_number}</span>
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
          {/* Weight & dimensions */}
          <Section title="Peso y dimensiones">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DtDd label="Peso real" value={wr.actual_weight_lb ? `${wr.actual_weight_lb} lb` : "—"} />
              <DtDd label="Peso volumétrico" value={wr.volumetric_weight_lb ? `${wr.volumetric_weight_lb.toFixed(2)} lb` : "—"} />
              <DtDd label="Peso facturable" value={wr.billable_weight_lb ? `${wr.billable_weight_lb.toFixed(2)} lb` : "—"} />
              <DtDd label="Piezas" value={String(wr.pieces_count)} />
              <DtDd label="Dimensiones" value={
                wr.length_in && wr.width_in && wr.height_in
                  ? `${wr.length_in} × ${wr.width_in} × ${wr.height_in} in`
                  : "—"
              } />
              <DtDd label="Transportista" value={wr.carrier ?? "—"} />
            </dl>
          </Section>

          {/* Recipient & details */}
          <Section title="Detalles">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DtDd label="Destinatario" value={wr.consignees?.full_name ?? "Sin asignar"} />
              <DtDd label="Remitente" value={wr.sender_name ?? "—"} />
              <DtDd label="Recibido" value={new Date(wr.received_at).toLocaleString("es")} />
              {wr.is_damaged && (
                <div className="col-span-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
                  <span className="font-medium">Dañado:</span> {wr.damage_description ?? "Sin descripción"}
                </div>
              )}
              {wr.is_dgr && (
                <div className="col-span-2 rounded-md bg-orange-50 p-2 text-sm text-orange-700">
                  Mercancía peligrosa (DGR)
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

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function DtDd({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-700">{value}</dd>
    </div>
  );
}
