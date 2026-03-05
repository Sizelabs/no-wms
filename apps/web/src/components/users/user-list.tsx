"use client";

import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import type { Role } from "@no-wms/shared/constants/roles";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { filterSelectClass } from "@/components/ui/form-section";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import {
  resendInvite,
  resetUserPassword,
  toggleUserActive,
} from "@/lib/actions/users";

interface UserRole {
  id: string;
  role: string;
}

interface User {
  id: string;
  full_name: string;
  is_active: boolean;
  user_roles: UserRole[];
}

interface UserListProps {
  users: User[];
  /** If provided, action buttons are only shown when the current user has one of these roles */
  allowedRoles?: Role[];
}

export function UserList({ users, allowedRoles }: UserListProps) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const currentRoles = useUserRoles();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const showActions = !allowedRoles || currentRoles.some((r) => allowedRoles.includes(r));

  const handleAction = useCallback(
    (action: () => Promise<{ error: string } | null>, successMessage: string) => {
      startTransition(async () => {
        const result = await action();
        if (result?.error) {
          notify(result.error, "error");
        } else {
          notify(successMessage, "success");
          router.refresh();
        }
      });
    },
    [router, notify],
  );

  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      const roleNames = u.user_roles.map((r) => (ROLE_LABELS[r.role as Role] ?? r.role).toLowerCase()).join(" ");
      const matches =
        u.full_name.toLowerCase().includes(q) ||
        roleNames.includes(q);
      if (!matches) return false;
    }
    if (statusFilter === "active" && !u.is_active) return false;
    if (statusFilter === "inactive" && u.is_active) return false;
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
          placeholder="Buscar usuario, rol..."
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

    <div ref={scrollRef} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Roles</th>
            <th className="px-4 py-3">Estado</th>
            {showActions && <th className="px-4 py-3">Acciones</th>}
          </tr>
        </thead>
        <VirtualTableBody
          items={filtered}
          scrollRef={scrollRef}
          colSpan={showActions ? 4 : 3}
          emptyMessage="No hay usuarios registrados."
          renderRow={(u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                <Link
                  href={`/${locale}/users/${u.id}`}
                  className="hover:underline"
                >
                  {u.full_name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {u.user_roles.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                    >
                      {ROLE_LABELS[r.role as Role] ?? r.role}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {u.is_active ? "Activo" : "Inactivo"}
                </span>
              </td>
              {showActions && (
              <td className="px-4 py-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      handleAction(
                        () => resendInvite(u.id),
                        "Invitación reenviada",
                      )
                    }
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    Reenviar invitación
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      handleAction(
                        () => resetUserPassword(u.id),
                        "Email de recuperación enviado",
                      )
                    }
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    Reset contraseña
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      handleAction(
                        () => toggleUserActive(u.id, !u.is_active),
                        u.is_active
                          ? "Usuario desactivado"
                          : "Usuario activado",
                      )
                    }
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    {u.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </td>
              )}
            </tr>
          )}
        />
      </table>
    </div>
    </div>
  );
}
