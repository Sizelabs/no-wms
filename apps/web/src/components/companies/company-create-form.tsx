"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { createOrganization } from "@/lib/actions/organizations";

export function CompanyCreateForm() {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createOrganization(formData);
        router.back();
      } catch (err) {
        notify(err instanceof Error ? err.message : "Error al crear empresa", "error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      {/* Company info */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">
          Datos de la Empresa
        </legend>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Nombre de la Empresa
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="logo_url"
            className="block text-sm font-medium text-gray-700"
          >
            URL del Logo (opcional)
          </label>
          <input
            id="logo_url"
            name="logo_url"
            type="url"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
      </fieldset>

      {/* Admin user */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">
          Administrador de la Empresa
        </legend>
        <div>
          <label
            htmlFor="admin_name"
            className="block text-sm font-medium text-gray-700"
          >
            Nombre completo
          </label>
          <input
            id="admin_name"
            name="admin_name"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="admin_email"
            className="block text-sm font-medium text-gray-700"
          >
            Correo electrónico
          </label>
          <input
            id="admin_email"
            name="admin_email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Se le enviará una invitación para configurar su contraseña.
          </p>
        </div>
      </fieldset>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("loading") : t("create")}
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
