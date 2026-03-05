"use client";

import type { Permission, Resource, RolePermissionMap } from "@no-wms/shared/constants/permissions";
import { DEFAULT_PERMISSIONS, RESOURCE_LABELS, RESOURCES } from "@no-wms/shared/constants/permissions";
import type { Role } from "@no-wms/shared/constants/roles";
import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { resetRolePermissions, saveRolePermission } from "@/lib/actions/permissions";

const CONFIGURABLE_ROLES: Role[] = [
  "forwarder_admin",
  "warehouse_admin",
  "warehouse_operator",
  "shipping_clerk",
  "destination_admin",
  "destination_operator",
  "agency",
];

const PERMISSION_LABELS: Record<Permission, string> = {
  create: "Crear",
  read: "Leer",
  update: "Editar",
  delete: "Eliminar",
};

const PERMISSIONS: Permission[] = ["create", "read", "update", "delete"];

interface Props {
  initialPermissions: Record<Role, RolePermissionMap>;
}

export function RolePermissionsPanel({ initialPermissions }: Props) {
  const [activeRole, setActiveRole] = useState<Role>("forwarder_admin");
  const [permissions, setPermissions] = useState(initialPermissions);
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const currentPerms = permissions[activeRole];
  const defaultPerms = DEFAULT_PERMISSIONS[activeRole];

  function handleToggle(resource: Resource, perm: Permission) {
    const current = currentPerms[resource][perm];
    const newPerms = {
      ...currentPerms[resource],
      [perm]: !current,
    };

    // Optimistic update
    setPermissions((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [resource]: newPerms,
      },
    }));

    startTransition(async () => {
      const result = await saveRolePermission(activeRole, resource, newPerms);
      if (result.error) {
        // Revert
        setPermissions((prev) => ({
          ...prev,
          [activeRole]: {
            ...prev[activeRole],
            [resource]: { ...currentPerms[resource] },
          },
        }));
        notify(result.error, "error");
      }
    });
  }

  function handleReset() {
    if (!confirm(`¿Restablecer permisos de "${ROLE_LABELS[activeRole]}" a valores predeterminados?`)) return;

    startTransition(async () => {
      const result = await resetRolePermissions(activeRole);
      if (result.error) {
        notify(result.error, "error");
      } else {
        setPermissions((prev) => ({
          ...prev,
          [activeRole]: DEFAULT_PERMISSIONS[activeRole],
        }));
        notify("Permisos restablecidos", "success");
      }
    });
  }

  function isDifferentFromDefault(resource: Resource, perm: Permission): boolean {
    return currentPerms[resource][perm] !== defaultPerms[resource][perm];
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200">
        <div className="-mb-px flex items-center gap-2 overflow-x-auto">
          {CONFIGURABLE_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeRole === role
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Configura los permisos CRUD para <strong>{ROLE_LABELS[activeRole]}</strong>.
          Los cambios aplican globalmente.
        </p>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Restablecer
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Recurso</th>
              {PERMISSIONS.map((p) => (
                <th key={p} className="px-4 py-3 text-center">{PERMISSION_LABELS[p]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {RESOURCES.map((resource) => (
              <tr key={resource} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {RESOURCE_LABELS[resource]}
                </td>
                {PERMISSIONS.map((perm) => {
                  const checked = currentPerms[resource][perm];
                  const modified = isDifferentFromDefault(resource, perm);
                  return (
                    <td key={perm} className="px-4 py-3 text-center">
                      <label className="inline-flex cursor-pointer items-center gap-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggle(resource, perm)}
                          disabled={isPending}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 disabled:opacity-50"
                        />
                        {modified && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" title="Modificado" />
                        )}
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> = valor modificado respecto al predeterminado.
        super_admin siempre tiene acceso completo y no es configurable.
      </p>
    </div>
  );
}
