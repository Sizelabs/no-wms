"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { createAgencyWithAdmin } from "@/lib/actions/agencies";

interface Courrier {
  id: string;
  name: string;
  code: string;
}

interface DestinationCountry {
  id: string;
  name: string;
  code: string;
}

interface AgencyCreateFormProps {
  organizationId: string;
  courriers: Courrier[];
  destinationCountries: DestinationCountry[];
  defaultCourrierId?: string;
  lockCourrier?: boolean;
}

export function AgencyCreateForm({
  organizationId,
  courriers,
  destinationCountries,
  defaultCourrierId,
  lockCourrier,
}: AgencyCreateFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("organization_id", organizationId);
    startTransition(async () => {
      try {
        await createAgencyWithAdmin(formData);
        router.back();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al crear agencia",
          "error",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      {/* Agency info */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">
          Datos de la Agencia
        </legend>
        <div>
          <label htmlFor="courrier_id" className="block text-sm font-medium text-gray-700">
            Courrier
          </label>
          <select
            id="courrier_id"
            name="courrier_id"
            required
            defaultValue={defaultCourrierId ?? ""}
            disabled={lockCourrier}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="" disabled>Seleccionar courrier</option>
            {courriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          {lockCourrier && defaultCourrierId && (
            <input type="hidden" name="courrier_id" value={defaultCourrierId} />
          )}
        </div>
        <div>
          <label htmlFor="destination_country_id" className="block text-sm font-medium text-gray-700">
            País destino
          </label>
          <select
            id="destination_country_id"
            name="destination_country_id"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            <option value="" disabled>Seleccionar país</option>
            {destinationCountries.map((dc) => (
              <option key={dc.id} value={dc.id}>
                {dc.name} ({dc.code})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre
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
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Código
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              maxLength={10}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            <option value="corporativo">Corporativo</option>
            <option value="box">Box</option>
          </select>
        </div>
        <div>
          <label htmlFor="ruc" className="block text-sm font-medium text-gray-700">
            RUC
          </label>
          <input
            id="ruc"
            name="ruc"
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Dirección
          </label>
          <input
            id="address"
            name="address"
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="allow_multi_package"
            name="allow_multi_package"
            type="checkbox"
            defaultChecked
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
          />
          <label htmlFor="allow_multi_package" className="text-sm text-gray-700">
            Permitir múltiples paquetes por recibo
          </label>
        </div>
      </fieldset>

      {/* Admin user */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-900">
          Administrador de la Agencia
        </legend>
        <div>
          <label htmlFor="admin_name" className="block text-sm font-medium text-gray-700">
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
          <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700">
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
