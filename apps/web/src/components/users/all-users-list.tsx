"use client";

import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import type { Role } from "@no-wms/shared/constants/roles";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import {
  resendInvite,
  resetUserPassword,
  toggleUserActive,
} from "@/lib/actions/users";

interface UserRole {
  id: string;
  role: string;
  courier_id: string | null;
  agency_id: string | null;
  couriers: { id: string; name: string } | null;
  agencies: { id: string; name: string } | null;
}

interface GroupedUser {
  id: string;
  full_name: string;
  is_active: boolean;
  organization_id: string | null;
  user_roles: UserRole[];
  organizations: { id: string; name: string } | null;
}

type EntityType = "forwarder" | "courier" | "agency" | "platform";

interface GroupedEntry {
  entityType: EntityType;
  entityName: string;
  entityId: string | null;
  users: GroupedUser[];
}

const ENTITY_LABELS: Record<EntityType, string> = {
  forwarder: "Forwarder",
  courier: "Courier",
  agency: "Agencia",
  platform: "Plataforma",
};

const ENTITY_BADGE_CLASS: Record<EntityType, string> = {
  forwarder: "bg-blue-50 text-blue-700",
  courier: "bg-purple-50 text-purple-700",
  agency: "bg-amber-50 text-amber-700",
  platform: "bg-gray-200 text-gray-700",
};

function groupUsers(users: GroupedUser[]): GroupedEntry[] {
  const groups = new Map<string, GroupedEntry>();

  for (const user of users) {
    let entityType: EntityType = "platform";
    let entityName = "Sin organización";
    let entityId: string | null = null;

    const agencyRole = user.user_roles.find(
      (r) => r.agency_id && r.agencies,
    );
    if (agencyRole?.agencies) {
      entityType = "agency";
      entityName = agencyRole.agencies.name;
      entityId = agencyRole.agencies.id;
    } else {
      const courierRole = user.user_roles.find(
        (r) => r.courier_id && r.couriers,
      );
      if (courierRole?.couriers) {
        entityType = "courier";
        entityName = courierRole.couriers.name;
        entityId = courierRole.couriers.id;
      } else if (user.organizations) {
        entityType = "forwarder";
        entityName = user.organizations.name;
        entityId = user.organizations.id;
      }
    }

    const key = `${entityType}:${entityId ?? "none"}`;
    const existing = groups.get(key);
    if (existing) {
      existing.users.push(user);
    } else {
      groups.set(key, { entityType, entityName, entityId, users: [user] });
    }
  }

  const order: EntityType[] = ["forwarder", "courier", "agency", "platform"];
  return Array.from(groups.values()).sort((a, b) => {
    const typeOrder = order.indexOf(a.entityType) - order.indexOf(b.entityType);
    if (typeOrder !== 0) return typeOrder;
    return a.entityName.localeCompare(b.entityName);
  });
}

const COL_COUNT = 4;

interface AllUsersListProps {
  users: GroupedUser[];
}

export function AllUsersList({ users }: AllUsersListProps) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
      const roleNames = u.user_roles
        .map((r) => (ROLE_LABELS[r.role as Role] ?? r.role).toLowerCase())
        .join(" ");
      const orgName = u.organizations?.name?.toLowerCase() ?? "";
      const courierNames = u.user_roles
        .map((r) => r.couriers?.name?.toLowerCase() ?? "")
        .join(" ");
      const agencyNames = u.user_roles
        .map((r) => r.agencies?.name?.toLowerCase() ?? "")
        .join(" ");
      const matches =
        u.full_name.toLowerCase().includes(q) ||
        roleNames.includes(q) ||
        orgName.includes(q) ||
        courierNames.includes(q) ||
        agencyNames.includes(q);
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

  let groups = groupUsers(filtered);

  if (typeFilter.length > 0) {
    groups = groups.filter((g) => typeFilter.includes(g.entityType));
  }

  const totalCount = groups.reduce((sum, g) => sum + g.users.length, 0);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar usuario, rol, organización..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todos los tipos"
          options={[
            { value: "forwarder", label: "Forwarder" },
            { value: "courier", label: "Courier" },
            { value: "agency", label: "Agencia" },
            { value: "platform", label: "Plataforma" },
          ]}
          selected={typeFilter}
          onChange={setTypeFilter}
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

      <div className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {totalCount === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="px-4 py-8 text-center text-gray-400">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              groups.map((group) => {
                const groupKey = `${group.entityType}:${group.entityId ?? "none"}`;
                const isCollapsed = collapsed.has(groupKey);
                return (
                  <React.Fragment key={groupKey}>
                    {/* Group header row */}
                    <tr className="sticky top-[40px] z-[5] border-t-2 border-gray-200 bg-gray-50">
                      <td
                        colSpan={3}
                        className="bg-gray-50 px-4 py-2.5 cursor-pointer select-none"
                        onClick={() => toggleCollapse(groupKey)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">{isCollapsed ? "▸" : "▾"}</span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${ENTITY_BADGE_CLASS[group.entityType]}`}
                          >
                            {ENTITY_LABELS[group.entityType]}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {group.entityName}
                          </span>
                        </div>
                      </td>
                      <td className="bg-gray-50 px-4 py-2.5 text-right text-xs text-gray-400">
                        {group.users.length} usuario{group.users.length !== 1 ? "s" : ""}
                      </td>
                    </tr>
                    {/* User rows */}
                    {!isCollapsed && group.users.map((u) => (
                      <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          <Link
                            href={`/${locale}/settings/users/${u.id}`}
                            className="hover:underline"
                          >
                            {u.full_name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
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
                        <td className="px-4 py-2.5">
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
                        <td className="px-4 py-2.5">
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
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
