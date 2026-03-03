"use client";

import { useEffect, useState, useTransition } from "react";

import { useAgencyScope } from "@/components/auth/role-provider";
import { getAgencySettings, updateAgencySettings } from "@/lib/actions/agencies";

interface AgencySettingRow {
  id: string;
  name: string;
  code: string;
  allow_multi_package: boolean;
}

export function AgencySettingsPanel() {
  const agencyIds = useAgencyScope();
  const [agencies, setAgencies] = useState<AgencySettingRow[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!agencyIds || agencyIds.length === 0) return;
    getAgencySettings(agencyIds).then((result) => {
      if (result.data) {
        setAgencies(result.data);
      }
    });
  }, [agencyIds]);

  // Not an agency user or no agencies assigned
  if (!agencyIds || agencyIds.length === 0) return null;
  if (agencies.length === 0) return null;

  function handleToggle(agencyId: string, currentValue: boolean) {
    startTransition(async () => {
      await updateAgencySettings(agencyId, {
        allow_multi_package: !currentValue,
      });
      setAgencies((prev) =>
        prev.map((a) =>
          a.id === agencyId ? { ...a, allow_multi_package: !currentValue } : a,
        ),
      );
    });
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Configuración de Agencia
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Opciones de recepción y paquetes para tu agencia.
        </p>
      </div>

      <div className="divide-y">
        {agencies.map((agency) => (
          <div key={agency.id} className="px-4 py-3">
            {agencies.length > 1 && (
              <p className="mb-2 text-xs font-medium text-gray-500">
                {agency.name} ({agency.code})
              </p>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Permitir múltiples paquetes por recibo
                </p>
                <p className="text-xs text-gray-500">
                  Cuando está desactivado, los operarios solo pueden registrar un paquete por recibo de bodega.
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggle(agency.id, agency.allow_multi_package)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 ${
                  agency.allow_multi_package ? "bg-gray-900" : "bg-gray-200"
                }`}
                role="switch"
                aria-checked={agency.allow_multi_package}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    agency.allow_multi_package ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
