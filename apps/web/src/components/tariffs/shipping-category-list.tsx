"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { filterSelectClass } from "@/components/ui/form-section";
import { deleteShippingCategory } from "@/lib/actions/tariffs";

interface ShippingCategory {
  id: string;
  country_code: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface ShippingCategoryListProps {
  data: ShippingCategory[];
}

export function ShippingCategoryList({ data }: ShippingCategoryListProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const countries = [...new Set(data.map((c) => c.country_code))].sort();

  const filtered = data.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
    }
    if (countryFilter && c.country_code !== countryFilter) return false;
    return true;
  });

  const handleDeactivate = (id: string) => {
    if (!confirm("¿Desactivar esta categoría?")) return;
    startTransition(async () => {
      const result = await deleteShippingCategory(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Categoría desactivada", "success");
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
          placeholder="Buscar código o nombre..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los países</option>
          {countries.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">País</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-xs font-medium">{c.country_code}</td>
                <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-3 text-xs">{c.name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.description ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{c.display_order}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Link
                      href={`tariffs/categories/${c.id}/edit`}
                      className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    {c.is_active && (
                      <button
                        onClick={() => handleDeactivate(c.id)}
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
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No hay categorías configuradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
