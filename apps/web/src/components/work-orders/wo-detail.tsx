"use client";

import type { WoStatus } from "@no-wms/shared/constants/statuses";
import { WO_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import type { WorkOrderType } from "@no-wms/shared/constants/work-order-types";
import { WORK_ORDER_TYPE_LABELS } from "@no-wms/shared/constants/work-order-types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { InfoCard, Section } from "@/components/ui/detail-page";
import type { UploadedPhoto } from "@/components/ui/photo-upload";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { updateWorkOrderStatus } from "@/lib/actions/work-orders";

interface WoDetailProps {
  wo: {
    id: string;
    wo_number: string;
    type: string;
    status: string;
    priority: string;
    instructions: string | null;
    result_notes: string | null;
    cancellation_reason: string | null;
    created_at: string;
    completed_at: string | null;
    pickup_date: string | null;
    pickup_time: string | null;
    pickup_location: string | null;
    pickup_authorized_person: string | null;
    pickup_contact_info: string | null;
    agencies: { name: string; code: string; type: string } | null;
    profiles: { full_name: string } | null;
    work_order_items: Array<{
      warehouse_receipt_id: string;
      warehouse_receipts: {
        wr_number: string;
        status: string;
        packages: { tracking_number: string; carrier: string }[];
      } | null;
    }>;
  };
  locale: string;
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  pending: "bg-orange-100 text-orange-800",
};

export function WoDetail({ wo, locale }: WoDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showExecution, setShowExecution] = useState(false);
  const [resultNotes, setResultNotes] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      if (newStatus === "cancelled") {
        const reason = prompt("Razón de cancelación:");
        if (reason === null) return;
        const fd = new FormData();
        fd.set("cancellation_reason", reason);
        startTransition(async () => {
          const result = await updateWorkOrderStatus(wo.id, newStatus, fd);
          if (result.error) setError(result.error);
          else router.refresh();
        });
      } else {
        startTransition(async () => {
          const result = await updateWorkOrderStatus(wo.id, newStatus);
          if (result.error) setError(result.error);
          else router.refresh();
        });
      }
    },
    [wo.id, router],
  );

  const handleComplete = useCallback(() => {
    if (!resultNotes.trim()) {
      setError("Las notas de resultado son requeridas");
      return;
    }
    if (photos.length === 0) {
      setError("Se requiere al menos 1 foto/evidencia");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("result_notes", resultNotes);
    fd.set("has_attachments", "true");
    startTransition(async () => {
      const result = await updateWorkOrderStatus(wo.id, "completed", fd);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }, [wo.id, resultNotes, photos, router]);

  const isActive = !["completed", "cancelled"].includes(wo.status);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Estado">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[wo.status] ?? ""}`}>
            {WO_STATUS_LABELS[wo.status as WoStatus] ?? wo.status}
          </span>
        </InfoCard>
        <InfoCard label="Tipo">
          {WORK_ORDER_TYPE_LABELS[wo.type as WorkOrderType] ?? wo.type}
        </InfoCard>
        <InfoCard label="Prioridad">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            wo.priority === "high" ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700"
          }`}>
            {wo.priority === "high" ? "Alta" : "Normal"}
          </span>
        </InfoCard>
        <InfoCard label="Agencia">
          {wo.agencies ? `${wo.agencies.name} (${wo.agencies.code})` : "—"}
        </InfoCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Details */}
        <div className="space-y-6">
          <Section title="Información">
            <dl className="space-y-2 text-sm">
              <WoDtDd label="Solicitado por" value={wo.profiles?.full_name ?? "—"} />
              <WoDtDd label="Fecha" value={new Date(wo.created_at).toLocaleString("es")} />
              {wo.completed_at && (
                <WoDtDd label="Completado" value={new Date(wo.completed_at).toLocaleString("es")} />
              )}
              {wo.instructions && (
                <div>
                  <dt className="text-xs text-gray-500">Instrucciones</dt>
                  <dd className="mt-0.5 rounded-md bg-gray-50 p-2 text-gray-700">{wo.instructions}</dd>
                </div>
              )}
              {wo.result_notes && (
                <div>
                  <dt className="text-xs text-gray-500">Notas de resultado</dt>
                  <dd className="mt-0.5 rounded-md bg-green-50 p-2 text-green-700">{wo.result_notes}</dd>
                </div>
              )}
              {wo.cancellation_reason && (
                <div>
                  <dt className="text-xs text-gray-500">Razón de cancelación</dt>
                  <dd className="mt-0.5 rounded-md bg-red-50 p-2 text-red-700">{wo.cancellation_reason}</dd>
                </div>
              )}
            </dl>
          </Section>

          {/* Pickup fields */}
          {wo.type === "authorize_pickup" && wo.pickup_date && (
            <Section title="Datos de retiro">
              <dl className="space-y-2 text-sm">
                <WoDtDd label="Fecha" value={wo.pickup_date} />
                {wo.pickup_time && <WoDtDd label="Hora" value={wo.pickup_time} />}
                {wo.pickup_location && <WoDtDd label="Ubicación" value={wo.pickup_location} />}
                {wo.pickup_authorized_person && <WoDtDd label="Persona autorizada" value={wo.pickup_authorized_person} />}
                {wo.pickup_contact_info && <WoDtDd label="Contacto" value={wo.pickup_contact_info} />}
              </dl>
            </Section>
          )}
        </div>

        {/* Right: WRs + Actions */}
        <div className="space-y-6">
          {/* WR list */}
          <Section title={`Warehouse Receipts (${wo.work_order_items.length})`}>
            <div className="space-y-1">
              {wo.work_order_items.map((item) => (
                <Link
                  key={item.warehouse_receipt_id}
                  href={`/${locale}/inventory/${item.warehouse_receipt_id}`}
                  className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-gray-50"
                >
                  <span className="font-mono text-xs font-medium">
                    {item.warehouse_receipts?.wr_number ?? "—"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.warehouse_receipts?.packages?.[0]?.tracking_number ?? ""}
                  </span>
                </Link>
              ))}
            </div>
          </Section>

          {/* Actions */}
          {isActive && (
            <Section title="Acciones">
              <div className="space-y-3">
                {wo.status === "requested" && (
                  <button
                    onClick={() => handleStatusChange("approved")}
                    disabled={isPending}
                    className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                )}
                {wo.status === "pending" && (
                  <button
                    onClick={() => handleStatusChange("approved")}
                    disabled={isPending}
                    className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Aprobar (Admin)
                  </button>
                )}
                {wo.status === "approved" && (
                  <button
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={isPending}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Iniciar Ejecución
                  </button>
                )}
                {wo.status === "in_progress" && !showExecution && (
                  <button
                    onClick={() => setShowExecution(true)}
                    className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Completar Orden
                  </button>
                )}
                {!["completed", "cancelled"].includes(wo.status) && (
                  <button
                    onClick={() => handleStatusChange("cancelled")}
                    disabled={isPending}
                    className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancelar OT
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* Execution form */}
          {showExecution && wo.status === "in_progress" && (
            <Section title="Completar orden de trabajo">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notas de resultado (requeridas)
                  </label>
                  <textarea
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    rows={3}
                    placeholder="Describa el trabajo realizado..."
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evidencia fotográfica (mínimo 1)
                  </label>
                  <PhotoUpload
                    bucket="wo-photos"
                    folder={`${wo.id}`}
                    minPhotos={1}
                    maxPhotos={10}
                    onPhotosChange={setPhotos}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleComplete}
                    disabled={isPending}
                    className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isPending ? "Completando..." : "Confirmar Completar"}
                  </button>
                  <button
                    onClick={() => setShowExecution(false)}
                    className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function WoDtDd({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-700">{value}</dd>
    </div>
  );
}
