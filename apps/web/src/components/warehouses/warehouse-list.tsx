"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { filterSelectClass } from "@/components/ui/form-section";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  timezone: string;
  is_active: boolean;
}

interface WarehouseListProps {
  warehouses: Warehouse[];
}

export function WarehouseList({ warehouses }: WarehouseListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = warehouses.filter((w) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        w.city?.toLowerCase().includes(q) ||
        w.country?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter === "active" && !w.is_active) return false;
    if (statusFilter === "inactive" && w.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Search + status row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar bodega, código, ciudad..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </select>
      </div>

    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Ciudad</th>
            <th className="px-4 py-3">País</th>
            <th className="px-4 py-3">Zona Horaria</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay bodegas registradas.
              </td>
            </tr>
          ) : (
            filtered.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{w.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/${locale}/warehouses/${w.id}`}
                    className="hover:underline"
                  >
                    {w.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{w.city ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{w.country ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{w.timezone}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {w.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}
