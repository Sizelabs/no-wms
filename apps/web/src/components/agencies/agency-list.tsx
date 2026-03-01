"use client";

import type { AgencyType } from "@no-wms/shared/constants/agency-types";
import { AGENCY_TYPE_LABELS } from "@no-wms/shared/constants/agency-types";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Agency {
  id: string;
  name: string;
  code: string;
  type: AgencyType;
  is_active: boolean;
  destination_countries: { name: string } | null;
}

interface AgencyListProps {
  agencies: Agency[];
}

export function AgencyList({ agencies }: AgencyListProps) {
  const { locale } = useParams<{ locale: string }>();

  return (
    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">País Destino</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {agencies.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay agencias registradas.
              </td>
            </tr>
          ) : (
            agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{agency.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/${locale}/agencies/${agency.id}`}
                    className="hover:underline"
                  >
                    {agency.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      agency.type === "corporativo"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {AGENCY_TYPE_LABELS[agency.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {agency.destination_countries?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      agency.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {agency.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
