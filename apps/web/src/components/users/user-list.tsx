"use client";

import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import type { Role } from "@no-wms/shared/constants/roles";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { InfoField } from "@/components/ui/info-field";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { useDetailFetch } from "@/hooks/use-detail-fetch";
import { useSheetState } from "@/hooks/use-sheet-state";
import {
  getUser,
  resendInvite,
  resetUserPassword,
  toggleUserActive,
} from "@/lib/actions/users";
import { formatDate } from "@/lib/format";

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
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

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
    if (statusFilter.length > 0) {
      const isActive = statusFilter.includes("active");
      const isInactive = statusFilter.includes("inactive");
      if (isActive && !isInactive && !u.is_active) return false;
      if (isInactive && !isActive && u.is_active) return false;
    }
    return true;
  });

  const { selectedId, selectedItem, open, openSheet, closeSheet } = useSheetState(filtered);

  const detailData = useDetailFetch(selectedId, getUser);

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
        <MultiSelectFilter
          label="Todos los estados"
          options={[
            { value: "active", label: "Activo" },
            { value: "inactive", label: "Inactivo" },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

    <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
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
          scrollElement={scrollEl}
          colSpan={showActions ? 4 : 3}
          emptyMessage="No hay usuarios registrados."
          renderRow={(u) => {
            const isSelected = open && u.id === selectedId;
            return (
            <tr
              key={u.id}
              className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
              onClick={() => openSheet(u.id)}
            >
              <td className="px-4 py-3 font-medium text-gray-900">
                <Link
                  href={`/${locale}/settings/users/${u.id}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
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
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
            );
          }}
        />
      </table>
    </div>

      <DetailSheet
        open={open}
        onClose={closeSheet}
        title={selectedItem?.full_name ?? ""}
        detailHref={selectedItem ? `/${locale}/settings/users/${selectedItem.id}` : undefined}
      >
        {selectedItem && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoField label="Nombre" value={selectedItem.full_name} />
              <InfoField label="Email" value={detailData?.email} />
              <InfoField label="Teléfono" value={detailData?.phone} />
              <InfoField label="Estado" value={selectedItem.is_active ? "Activo" : "Inactivo"} />
              <InfoField label="Registrado" value={detailData ? formatDate(detailData.created_at) : null} />
            </div>
            <div className="border-t pt-4">
              <h3 className="mb-3 text-xs font-medium uppercase text-gray-500">
                Roles ({(detailData?.user_roles ?? selectedItem.user_roles).length})
              </h3>
              <div className="space-y-2">
                {(detailData?.user_roles ?? selectedItem.user_roles).map((r: { id: string; role: string; warehouse_id?: string | null; destination_id?: string | null; courier_id?: string | null; agency_id?: string | null }) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <span className="font-medium text-gray-900">
                      {ROLE_LABELS[r.role as Role] ?? r.role}
                    </span>
                    {(r.warehouse_id || r.destination_id || r.courier_id || r.agency_id) && (
                      <div className="flex gap-2 text-xs text-gray-500">
                        {r.warehouse_id && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">Bodega</span>
                        )}
                        {r.destination_id && (
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">Destino</span>
                        )}
                        {r.courier_id && (
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">Courier</span>
                        )}
                        {r.agency_id && (
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-700">Agencia</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DetailSheet>
    </div>
  );
}
