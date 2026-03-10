"use client";

import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS } from "@no-wms/shared/constants/locations";
import type { MovementType } from "@no-wms/shared/constants/locations";
import { ArrowRight, History } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { getMovementsForPackage } from "@/lib/actions/location-management";

type Movement = Awaited<ReturnType<typeof getMovementsForPackage>>[number];

interface Props {
  packageId: string;
}

export function MovementHistory({ packageId }: Props) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getMovementsForPackage(packageId);
      setMovements(data);
    });
  }, [packageId]);

  if (isPending && movements.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">Cargando historial...</p>;
  }

  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <History className="h-8 w-8 text-gray-200" />
        <p className="mt-2 text-sm text-gray-400">Sin movimientos registrados</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Desde</th>
            <th className="px-3 py-2">Hacia</th>
            <th className="px-3 py-2">Operador</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {movements.map((m) => {
            const typeLabel = MOVEMENT_TYPE_LABELS[m.movement_type as MovementType] ?? m.movement_type;
            const typeColor = MOVEMENT_TYPE_COLORS[m.movement_type as MovementType] ?? "bg-gray-100 text-gray-700";
            const fromLoc = m.from_location as { code: string } | { code: string }[] | null;
            const toLoc = m.to_location as { code: string } | { code: string }[] | null;
            const movedBy = m.moved_by_profile as { full_name: string } | { full_name: string }[] | null;

            const fromCode = fromLoc ? (Array.isArray(fromLoc) ? fromLoc[0]?.code : fromLoc.code) : "—";
            const toCode = toLoc ? (Array.isArray(toLoc) ? toLoc[0]?.code : toLoc.code) : "—";
            const operatorName = movedBy ? (Array.isArray(movedBy) ? movedBy[0]?.full_name : movedBy.full_name) : "—";

            return (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(m.created_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColor}`}>
                    {typeLabel}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-gray-600">{fromCode}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-gray-300" />
                    <span className="font-mono text-xs text-gray-900">{toCode}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{operatorName}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
