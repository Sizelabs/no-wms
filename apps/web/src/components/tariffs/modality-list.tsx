"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { filterSelectClass } from "@/components/ui/form-section";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { deleteModality } from "@/lib/actions/tariffs";

interface ModalityItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface ModalityListProps {
  data: ModalityItem[];
}

export function ModalityList({ data }: ModalityListProps) {
  const { locale } = useParams<{ locale: string }>();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = data.filter((m) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !m.name.toLowerCase().includes(q) &&
        !m.code.toLowerCase().includes(q) &&
        !m.description?.toLowerCase().includes(q)
      ) return false;
    }
    if (statusFilter === "active" && !m.is_active) return false;
    if (statusFilter === "inactive" && m.is_active) return false;
    return true;
  });

  const handleDeactivate = (id: string) => {
    if (!confirm("¿Desactivar esta modalidad?")) return;
    startTransition(async () => {
      const result = await deleteModality(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Modalidad desactivada", "success");
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
          placeholder="Buscar modalidad..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
      </div>

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={5}
            emptyMessage="No hay modalidades registradas."
            renderRow={(m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{m.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                <td className="px-4 py-3 text-gray-500">{m.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {m.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Link
                      href={`/${locale}/settings/modalities/${m.id}/edit`}
                      className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    {m.is_active && (
                      <button
                        onClick={() => handleDeactivate(m.id)}
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
