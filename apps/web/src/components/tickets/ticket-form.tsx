"use client";

import { TICKET_CATEGORIES } from "@no-wms/shared/constants/statuses";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { createTicket } from "@/lib/actions/tickets";

interface TicketFormProps {
  agencies?: Array<{ id: string; name: string; code: string }>;
  agencyId?: string; // Pre-set for agency-role users
  wrs?: Array<{ id: string; wr_number: string; packages?: { tracking_number: string }[] }>;
}

export function TicketForm({ agencies, agencyId, wrs }: TicketFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Collect selected WR IDs
    const selectedWrs = Array.from(form.querySelectorAll<HTMLInputElement>("input[name='wr_ids']:checked"))
      .map((cb) => cb.value);
    if (selectedWrs.length) {
      formData.set("warehouse_receipt_ids", JSON.stringify(selectedWrs));
    }

    startTransition(async () => {
      const result = await createTicket(formData);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Ticket creado", "success");
        router.push(`/tickets/${result.id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
      {/* Agency selector (for admin roles) */}
      {agencies && !agencyId && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Agencia</label>
          <select name="agency_id" required className="mt-1 w-full rounded border px-3 py-2 text-sm">
            <option value="">Seleccionar agencia</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>
      )}
      {agencyId && <input type="hidden" name="agency_id" value={agencyId} />}

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Categoría</label>
        <select name="category" required className="mt-1 w-full rounded border px-3 py-2 text-sm">
          <option value="">Seleccionar categoría</option>
          {TICKET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Asunto</label>
        <input
          name="subject"
          type="text"
          required
          maxLength={255}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          placeholder="Breve descripción del problema"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Descripción</label>
        <textarea
          name="description"
          required
          rows={4}
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          placeholder="Detalle completo del problema o consulta"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Prioridad</label>
        <select name="priority" defaultValue="normal" className="mt-1 w-full rounded border px-3 py-2 text-sm">
          <option value="low">Baja</option>
          <option value="normal">Normal</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>
      </div>

      {/* WR linking */}
      {wrs && wrs.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">WRs Relacionados (opcional)</label>
          <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded border p-2">
            {wrs.map((wr) => (
              <label key={wr.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="wr_ids" value={wr.id} className="rounded border-gray-300" />
                <span className="font-mono text-xs">{wr.wr_number}</span>
                <span className="text-xs text-gray-500">{wr.packages?.[0]?.tracking_number ?? ""}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Crear Ticket
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
