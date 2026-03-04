"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

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
  const [search, setSearch] = useState("");

  const filtered = companies.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empresa, slug..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
      </div>

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
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay empresas registradas.
              </td>
            </tr>
          ) : (
            filtered.map((company) => {
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
    </div>
  );
}
