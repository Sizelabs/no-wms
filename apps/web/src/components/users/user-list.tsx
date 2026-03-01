"use client";

import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import type { Role } from "@no-wms/shared/constants/roles";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
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
}

export function UserList({ users }: UserListProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Roles</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center text-gray-400"
              >
                No hay usuarios registrados.
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.full_name}
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
