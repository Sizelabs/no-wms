"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

interface Consignee {
  id: string;
  full_name: string;
  casillero: string;
  cedula_ruc: string | null;
  city: string | null;
  is_active: boolean;
  agency_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agencies: any;
}

interface ConsigneeListProps {
  consignees: Consignee[];
}

function getAgencyName(agencies: unknown): string {
  if (!agencies) return "—";
  if (Array.isArray(agencies)) return (agencies[0] as { name: string })?.name ?? "—";
  return (agencies as { name: string }).name ?? "—";
}

export function ConsigneeList({ consignees }: ConsigneeListProps) {
  const { locale } = useParams<{ locale: string }>();

  return (
    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Casillero</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Cédula/RUC</th>
            <th className="px-4 py-3">Agencia</th>
            <th className="px-4 py-3">Ciudad</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {consignees.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay consignatarios registrados.
              </td>
            </tr>
          ) : (
            consignees.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{c.casillero}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link
                    href={`/${locale}/consignees/${c.id}`}
                    className="hover:underline"
                  >
                    {c.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.cedula_ruc ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {getAgencyName(c.agencies)}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.city ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {c.is_active ? "Activo" : "Inactivo"}
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
