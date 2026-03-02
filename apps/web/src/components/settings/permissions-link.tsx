"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useUserRoles } from "@/components/auth/role-provider";

export function PermissionsLink() {
  const roles = useUserRoles();
  const { locale } = useParams<{ locale: string }>();

  if (!roles.includes("super_admin")) return null;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Permisos por Rol</h3>
          <p className="text-sm text-gray-500">
            Configura los permisos CRUD de cada rol para cada recurso del sistema.
          </p>
        </div>
        <Link
          href={`/${locale}/settings/permissions`}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Gestionar Permisos
        </Link>
      </div>
    </div>
  );
}
