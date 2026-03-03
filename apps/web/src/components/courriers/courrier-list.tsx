"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

interface CourrierCoverage {
  id: string;
  destination_countries: { name: string; code: string } | null;
}

interface Courrier {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
  courrier_coverage: CourrierCoverage[];
}

interface CourrierListProps {
  courriers: Courrier[];
}

export function CourrierList({ courriers }: CourrierListProps) {
  const { locale } = useParams<{ locale: string }>();

  return (
    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Cobertura</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {courriers.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No hay courriers registrados.
              </td>
            </tr>
          ) : (
            courriers.map((courrier) => {
              const countries = courrier.courrier_coverage
                .map((c) => c.destination_countries?.name)
                .filter(Boolean);
              const uniqueCountries = [...new Set(countries)];

              return (
                <tr key={courrier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{courrier.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link
                      href={`/${locale}/courriers/${courrier.id}`}
                      className="hover:underline"
                    >
                      {courrier.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        courrier.type === "corporativo"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {courrier.type === "corporativo" ? "Corporativo" : "Box"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {uniqueCountries.length > 0
                      ? uniqueCountries.join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        courrier.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {courrier.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
