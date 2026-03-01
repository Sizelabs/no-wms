"use client";

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
  return (
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
          {warehouses.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay bodegas registradas.
              </td>
            </tr>
          ) : (
            warehouses.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{w.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {w.name}
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
  );
}
