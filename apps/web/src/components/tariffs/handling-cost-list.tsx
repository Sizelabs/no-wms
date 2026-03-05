"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { filterSelectClass } from "@/components/ui/form-section";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { deleteHandlingCost } from "@/lib/actions/tariffs";

interface HandlingCost {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface HandlingCostListProps {
  data: HandlingCost[];
}

export function HandlingCostList({ data }: HandlingCostListProps) {
  const { locale } = useParams<{ locale: string }>();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = data.filter((hc) => {
    if (search) {
      const q = search.toLowerCase();
      if (!hc.name.toLowerCase().includes(q) && !hc.description?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter === "active" && !hc.is_active) return false;
    if (statusFilter === "inactive" && hc.is_active) return false;
    return true;
  });

  const handleDeactivate = (id: string) => {
    if (!confirm("¿Desactivar este costo de manejo?")) return;
    startTransition(async () => {
      const result = await deleteHandlingCost(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Costo de manejo desactivado", "success");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar costo de manejo..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={4}
            emptyMessage="No hay costos de manejo registrados."
            renderRow={(hc) => (
              <tr key={hc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{hc.name}</td>
                <td className="px-4 py-3 text-gray-500">{hc.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      hc.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {hc.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Link
                      href={`/${locale}/settings/handling-costs/${hc.id}/edit`}
                      className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    {hc.is_active && (
                      <button
                        onClick={() => handleDeactivate(hc.id)}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          />
        </table>
      </div>
    </div>
  );
}
