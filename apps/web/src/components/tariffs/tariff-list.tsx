"use client";

import { MODALITY_LABELS } from "@no-wms/shared/constants/modalities";
import Link from "next/link";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { deleteTariffSchedule } from "@/lib/actions/tariffs";

interface TariffSchedule {
  id: string;
  modality: string;
  courier_category: string | null;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  agencies: { name: string; code: string } | null;
  destination_countries: { name: string; code: string } | null;
}

interface TariffListProps {
  data: TariffSchedule[];
}

export function TariffList({ data }: TariffListProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ agency: "", active: "" });
  const [showFilters, setShowFilters] = useState(false);

  const filtered = data.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        t.agencies?.name?.toLowerCase().includes(q) ||
        t.agencies?.code?.toLowerCase().includes(q) ||
        t.destination_countries?.name?.toLowerCase().includes(q) ||
        t.modality?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filter.agency && t.agencies?.code !== filter.agency) return false;
    if (filter.active === "true" && !t.is_active) return false;
    if (filter.active === "false" && t.is_active) return false;
    return true;
  });

  const agencies = [...new Set(data.map((t) => t.agencies?.code).filter(Boolean))];
  const activeFilterCount = [filter.agency].filter(Boolean).length;

  const handleDeactivate = (id: string) => {
    if (!confirm("¿Desactivar esta tarifa?")) return;
    startTransition(async () => {
      const result = await deleteTariffSchedule(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Tarifa desactivada", "success");
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Search + primary filter row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar agencia, destino, modalidad..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={filter.active}
          onChange={(e) => setFilter((f) => ({ ...f, active: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-md border px-3 py-2 text-sm ${
            activeFilterCount > 0
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-md border bg-gray-50 p-3">
          <select
            value={filter.agency}
            onChange={(e) => setFilter((f) => ({ ...f, agency: e.target.value }))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todas las agencias</option>
            {agencies.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilter((f) => ({ ...f, agency: "" }))}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Modalidad</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Vigente desde</th>
              <th className="px-4 py-3">Vigente hasta</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-xs">
                  {t.agencies ? `${t.agencies.name} (${t.agencies.code})` : "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {t.destination_countries?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {MODALITY_LABELS[t.modality as keyof typeof MODALITY_LABELS] ?? t.modality}
                </td>
                <td className="px-4 py-3 text-xs">{t.courier_category ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {new Date(t.effective_from).toLocaleDateString("es")}
                </td>
                <td className="px-4 py-3 text-xs">
                  {t.effective_to ? new Date(t.effective_to).toLocaleDateString("es") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Link
                      href={`tariffs/${t.id}`}
                      className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`tariffs/${t.id}/edit`}
                      className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    {t.is_active && (
                      <button
                        onClick={() => handleDeactivate(t.id)}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No hay tarifas configuradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
