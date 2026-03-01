"use client";

import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

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

interface InviteUserFormProps {
  organizationId: string;
}

export function InviteUserForm({ organizationId }: InviteUserFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = fd.get("full_name") as string;
    const email = fd.get("email") as string;
    const role = fd.get("role") as string;

    startTransition(async () => {
      const result = await inviteUser(organizationId, fullName, email, role);
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
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
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
