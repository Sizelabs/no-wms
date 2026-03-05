"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { filterSelectClass } from "@/components/ui/form-section";

interface CourierWarehouseDestination {
  id: string;
  destinations: { city: string; country_code: string } | null;
}

interface CourierWarehouse {
  id: string;
  courier_warehouse_destinations: CourierWarehouseDestination[];
}

interface Courier {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
  courier_warehouses: CourierWarehouse[];
}

interface CourierListProps {
  couriers: Courier[];
}

export function CourierList({ couriers }: CourierListProps) {
  const { locale } = useParams<{ locale: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = couriers.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const destinations = c.courier_warehouses
        .flatMap((cw) => cw.courier_warehouse_destinations)
        .map((cwd) => cwd.destinations?.city ?? "")
        .join(" ");
      const matches =
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        destinations.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter === "active" && !c.is_active) return false;
    if (statusFilter === "inactive" && c.is_active) return false;
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
          placeholder="Buscar courier, código, destino..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Destinos</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No hay couriers registrados.
              </td>
            </tr>
          ) : (
            filtered.map((courier) => {
              const destinations = courier.courier_warehouses
                .flatMap((cw) => cw.courier_warehouse_destinations)
                .map((cwd) => cwd.destinations?.city)
                .filter(Boolean);
              const uniqueDestinations = [...new Set(destinations)];

              return (
                <tr key={courier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{courier.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link
                      href={`/${locale}/couriers/${courier.id}`}
                      className="hover:underline"
                    >
                      {courier.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        courier.type === "corporativo"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {courier.type === "corporativo" ? "Corporativo" : "Box"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {uniqueDestinations.length > 0
                      ? uniqueDestinations.join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        courier.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {courier.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}
