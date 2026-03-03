"use client";

import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inviteUser } from "@/lib/actions/users";

const ASSIGNABLE_ROLES = [
  "company_admin",
  "warehouse_admin",
  "warehouse_operator",
  "shipping_clerk",
  "destination_admin",
  "destination_operator",
  "agency",
] as const;

const WAREHOUSE_ROLES = ["warehouse_admin", "warehouse_operator", "shipping_clerk"];
const COURRIER_ROLES = ["destination_admin", "destination_operator"];
const AGENCY_ROLES = ["agency"];

interface InviteUserFormProps {
  organizationId: string;
  warehouses?: { id: string; name: string; code: string }[];
  courriers?: { id: string; name: string; code: string }[];
  agencies?: { id: string; name: string; code: string }[];
}

export function InviteUserForm({ organizationId, warehouses = [], courriers = [], agencies = [] }: InviteUserFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<string>(ASSIGNABLE_ROLES[0]);

  const showWarehouse = WAREHOUSE_ROLES.includes(selectedRole);
  const showCourrier = COURRIER_ROLES.includes(selectedRole);
  const showAgency = AGENCY_ROLES.includes(selectedRole);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = fd.get("full_name") as string;
    const email = fd.get("email") as string;
    const role = fd.get("role") as string;
    const warehouseId = fd.get("warehouse_id") as string | null;
    const courrierId = fd.get("courrier_id") as string | null;
    const agencyId = fd.get("agency_id") as string | null;

    startTransition(async () => {
      const result = await inviteUser(organizationId, fullName, email, role, {
        warehouse_id: warehouseId || undefined,
        courrier_id: courrierId || undefined,
        agency_id: agencyId || undefined,
      });
      if (result?.error) {
        notify(result.error, "error");
      } else {
        router.back();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label
          htmlFor="full_name"
          className="block text-sm font-medium text-gray-700"
        >
          Nombre completo
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Se le enviará una invitación para configurar su contraseña.
        </p>
      </div>
      <div>
        <label
          htmlFor="role"
          className="block text-sm font-medium text-gray-700"
        >
          Rol
        </label>
        <select
          id="role"
          name="role"
          required
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {showWarehouse && (
        <div>
          <label
            htmlFor="warehouse_id"
            className="block text-sm font-medium text-gray-700"
          >
            Almacén asignado
          </label>
          <select
            id="warehouse_id"
            name="warehouse_id"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            <option value="">Seleccionar almacén...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {showCourrier && (
        <div>
          <label
            htmlFor="courrier_id"
            className="block text-sm font-medium text-gray-700"
          >
            Courrier asignado
          </label>
          <select
            id="courrier_id"
            name="courrier_id"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            <option value="">Seleccionar courrier...</option>
            {courriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {showAgency && (
        <div>
          <label
            htmlFor="agency_id"
            className="block text-sm font-medium text-gray-700"
          >
            Agencia asignada
          </label>
          <select
            id="agency_id"
            name="agency_id"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            <option value="">Seleccionar agencia...</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("loading") : "Enviar Invitación"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
