"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { TariffRateForm } from "@/components/tariffs/tariff-rate-form";
import { deleteTariffRate, importTariffRates } from "@/lib/actions/tariffs";

interface TariffRate {
  id: string;
  min_weight_lb: number;
  max_weight_lb: number;
  rate_per_lb: number;
  minimum_charge: number;
}

interface TariffRatesTableProps {
  scheduleId: string;
  rates: TariffRate[];
  readOnly?: boolean;
}

export function TariffRatesTable({ scheduleId, rates, readOnly }: TariffRatesTableProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...rates].sort((a, b) => a.min_weight_lb - b.min_weight_lb);

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta banda de tarifa?")) return;
    startTransition(async () => {
      const result = await deleteTariffRate(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Banda eliminada", "success");
        router.refresh();
      }
    });
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      startTransition(async () => {
        const result = await importTariffRates(scheduleId, csv);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify(`${result.count} bandas importadas`, "success");
          router.refresh();
        }
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleFormDone = () => {
    setShowAddForm(false);
    setEditingId(null);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Bandas de Tarifa</h3>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              + Agregar banda
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              Importar CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              className="hidden"
            />
          </div>
        )}
      </div>

      {showAddForm && (
        <TariffRateForm scheduleId={scheduleId} onDone={handleFormDone} />
      )}

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2">Min (lb)</th>
              <th className="px-4 py-2">Max (lb)</th>
              <th className="px-4 py-2">$/lb</th>
              <th className="px-4 py-2">Cargo mínimo</th>
              {!readOnly && <th className="px-4 py-2">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((rate) => (
              editingId === rate.id ? (
                <tr key={rate.id}>
                  <td colSpan={readOnly ? 4 : 5} className="p-2">
                    <TariffRateForm
                      scheduleId={scheduleId}
                      rate={rate}
                      onDone={handleFormDone}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={rate.id}>
                  <td className="px-4 py-2 text-xs">{Number(rate.min_weight_lb).toFixed(2)}</td>
                  <td className="px-4 py-2 text-xs">{Number(rate.max_weight_lb).toFixed(2)}</td>
                  <td className="px-4 py-2 text-xs font-medium">${Number(rate.rate_per_lb).toFixed(4)}</td>
                  <td className="px-4 py-2 text-xs">
                    {Number(rate.minimum_charge) > 0 ? `$${Number(rate.minimum_charge).toFixed(2)}` : "—"}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingId(rate.id)}
                          className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(rate.id)}
                          disabled={isPending}
                          className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            ))}
            {!sorted.length && (
              <tr>
                <td colSpan={readOnly ? 4 : 5} className="px-4 py-6 text-center text-xs text-gray-400">
                  No hay bandas de tarifa configuradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
