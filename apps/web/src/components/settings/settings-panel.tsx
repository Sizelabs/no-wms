"use client";

import type { SettingScope } from "@no-wms/shared/constants/settings";
import {
  SCOPE_LABELS,
  SCOPE_ORDER,
  SETTING_DEFINITIONS,
} from "@no-wms/shared/constants/settings";
import { useState } from "react";

export function SettingsPanel() {
  const [activeScope, setActiveScope] = useState<SettingScope>("organization");

  const scopeSettings = SETTING_DEFINITIONS.filter((s) =>
    s.scopes.includes(activeScope),
  );

  return (
    <div className="space-y-4">
      {/* Scope tabs */}
      <div className="flex gap-1 rounded-lg border bg-white p-1">
        {SCOPE_ORDER.map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => setActiveScope(scope)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeScope === scope
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {SCOPE_LABELS[scope]}
          </button>
        ))}
      </div>

      {/* Settings list */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Configuración — {SCOPE_LABELS[activeScope]}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Los valores definidos en este nivel sobrescriben los niveles superiores.
          </p>
        </div>

        <div className="divide-y">
          {scopeSettings.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No hay configuraciones disponibles para este nivel.
            </div>
          ) : (
            scopeSettings.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                  <p className="text-xs text-gray-500">{setting.description}</p>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <SettingValueDisplay setting={setting} />
                  <span className="rounded border bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                    {setting.type}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cascade explanation */}
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Cascada de resolución
        </h3>
        <p className="mt-1 text-xs text-gray-400">
          Usuario → Agencia → Destino → Bodega → Organización → Plataforma.
          El primer valor encontrado gana.
        </p>
      </div>
    </div>
  );
}

function SettingValueDisplay({ setting }: { setting: typeof SETTING_DEFINITIONS[number] }) {
  const defaultValue = setting.defaultValue;

  if (setting.type === "boolean") {
    return (
      <span className="text-sm text-gray-600">
        {defaultValue ? "Sí" : "No"}
      </span>
    );
  }

  if (setting.type === "json") {
    return (
      <span className="text-sm text-gray-600">
        {Array.isArray(defaultValue)
          ? `${defaultValue.length} items`
          : "JSON"}
      </span>
    );
  }

  return (
    <span className="text-sm font-mono text-gray-600">
      {String(defaultValue)}
    </span>
  );
}
