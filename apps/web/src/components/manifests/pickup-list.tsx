"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updatePickupStatus } from "@/lib/actions/manifests";

interface Pickup {
  id: string;
  status: string;
  pickup_date: string;
  pickup_time: string | null;
  pickup_location: string;
  authorized_person_name: string;
  contact_phone: string | null;
  created_at: string;
  agencies: { name: string; code: string } | null;
  pickup_request_wrs: { warehouse_receipt_id: string }[];
}

interface PickupListProps {
  data: Pickup[];
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-800",
  scheduled: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Solicitado",
  scheduled: "Programado",
  completed: "Completado",
  cancelled: "Cancelado",
};

export function PickupList({ data }: PickupListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatus = (id: string, status: string) => {
    startTransition(async () => {
      await updatePickupStatus(id, status);
      router.refresh();
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Agencia</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Hora</th>
            <th className="px-4 py-3">Ubicación</th>
            <th className="px-4 py-3">Persona autorizada</th>
            <th className="px-4 py-3">WRs</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 text-xs">
                {p.agencies ? `${p.agencies.name} (${p.agencies.code})` : "—"}
              </td>
              <td className="px-4 py-3 text-xs">{p.pickup_date}</td>
              <td className="px-4 py-3 text-xs">{p.pickup_time ?? "—"}</td>
              <td className="px-4 py-3 text-xs">{p.pickup_location}</td>
              <td className="px-4 py-3 text-xs">{p.authorized_person_name}</td>
              <td className="px-4 py-3 text-xs">{p.pickup_request_wrs.length}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] ?? ""}`}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {p.status === "requested" && (
                    <button
                      onClick={() => handleStatus(p.id, "scheduled")}
                      disabled={isPending}
                      className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                    >
                      Programar
                    </button>
                  )}
                  {p.status === "scheduled" && (
                    <button
                      onClick={() => handleStatus(p.id, "completed")}
                      disabled={isPending}
                      className="rounded border px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                    >
                      Completar
                    </button>
                  )}
                  {!["completed", "cancelled"].includes(p.status) && (
                    <button
                      onClick={() => handleStatus(p.id, "cancelled")}
                      disabled={isPending}
                      className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                No hay solicitudes de retiro
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
