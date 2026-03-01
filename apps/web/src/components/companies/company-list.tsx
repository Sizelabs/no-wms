"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

interface CompanyListProps {
  companies: Organization[];
  counts: Record<string, { warehouses: number; agencies: number; users: number }>;
}

export function CompanyList({ companies, counts }: CompanyListProps) {
  const { locale } = useParams<{ locale: string }>();

  return (
    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Empresa</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Bodegas</th>
            <th className="px-4 py-3">Agencias</th>
            <th className="px-4 py-3">Usuarios</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {companies.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay empresas registradas.
              </td>
            </tr>
          ) : (
            companies.map((company) => {
              const c = counts[company.id] ?? {
                warehouses: 0,
                agencies: 0,
                users: 0,
              };
              return (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {company.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {company.slug}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.warehouses}</td>
                  <td className="px-4 py-3 text-gray-600">{c.agencies}</td>
                  <td className="px-4 py-3 text-gray-600">{c.users}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/companies/${company.id}`}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      Ver detalle
                    </Link>
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
