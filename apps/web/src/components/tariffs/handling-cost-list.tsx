"use client";

import { RATE_UNIT_LABELS, type RateUnit } from "@no-wms/shared/constants/tariff";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { filterSelectClass } from "@/components/ui/form-section";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import {
  deleteHandlingCost,
  resetCourierTariff,
  updateCourierTariff,
  updateHandlingCost,
} from "@/lib/actions/tariffs";

interface HandlingCostRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  rate: number;
  rate_unit: string;
  minimum_charge: number | null;
  is_custom: boolean;
}

interface HandlingCostListProps {
  data: HandlingCostRow[];
  selectedCourierId?: string;
}

export function HandlingCostList({ data, selectedCourierId }: HandlingCostListProps) {
  const { locale } = useParams<{ locale: string }>();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [editRateUnit, setEditRateUnit] = useState("flat");
  const [editMinCharge, setEditMinCharge] = useState("");

  const filtered = data.filter((hc) => {
    if (search) {
      const q = search.toLowerCase();
      if (!hc.name.toLowerCase().includes(q) && !hc.description?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter === "active" && !hc.is_active) return false;
    if (statusFilter === "inactive" && hc.is_active) return false;
    return true;
  });

  const handleDeactivate = (id: string) => {
    if (!confirm("¿Desactivar este costo de manejo?")) return;
    startTransition(async () => {
      const result = await deleteHandlingCost(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Costo de manejo desactivado", "success");
      }
    });
  };

  const startEditing = (hc: HandlingCostRow) => {
    setEditingId(hc.id);
    setEditRate(hc.rate.toString());
    setEditRateUnit(hc.rate_unit);
    setEditMinCharge(hc.minimum_charge?.toString() ?? "");
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = (handlingCostId: string) => {
    startTransition(async () => {
      const rate = parseFloat(editRate) || 0;
      const rateUnit = editRateUnit;
      const minCharge = editMinCharge ? parseFloat(editMinCharge) : null;

      if (selectedCourierId) {
        const result = await updateCourierTariff(selectedCourierId, handlingCostId, {
          rate,
          rate_unit: rateUnit,
          minimum_charge: minCharge,
        });
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Tarifa del courier actualizada", "success");
        }
      } else {
        const formData = new FormData();
        formData.set("base_rate", rate.toString());
        formData.set("base_rate_unit", rateUnit);
        formData.set("base_minimum_charge", minCharge?.toString() ?? "");
        const result = await updateHandlingCost(handlingCostId, formData);
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Tarifa base actualizada", "success");
        }
      }
      setEditingId(null);
    });
  };

  const handleResetToBase = (handlingCostId: string) => {
    if (!selectedCourierId) return;
    startTransition(async () => {
      const result = await resetCourierTariff(selectedCourierId, handlingCostId);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Tarifa restaurada a base", "success");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar costo de manejo..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-280px)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tarifa</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Mínimo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={7}
            emptyMessage="No hay costos de manejo registrados."
            renderRow={(hc) => (
              <tr key={hc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-400">{hc.display_order}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {hc.name}
                  {selectedCourierId && hc.is_custom && (
                    <span className="ml-2 inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Personalizado
                    </span>
                  )}
                </td>
                {editingId === hc.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-xs font-mono focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editRateUnit}
                        onChange={(e) => setEditRateUnit(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                      >
                        {Object.entries(RATE_UNIT_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={editMinCharge}
                        onChange={(e) => setEditMinCharge(e.target.value)}
                        placeholder="—"
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-xs font-mono focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono text-xs">
                      ${hc.rate.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {RATE_UNIT_LABELS[hc.rate_unit as RateUnit] ?? hc.rate_unit}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {hc.minimum_charge != null ? `$${hc.minimum_charge.toFixed(2)}` : "—"}
                    </td>
                  </>
                )}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      hc.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {hc.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {editingId === hc.id ? (
                      <>
                        <button
                          onClick={() => saveEditing(hc.id)}
                          disabled={isPending}
                          className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-700 hover:bg-green-100"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(hc)}
                          className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Tarifa
                        </button>
                        {selectedCourierId && hc.is_custom && (
                          <button
                            onClick={() => handleResetToBase(hc.id)}
                            disabled={isPending}
                            className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                          >
                            Restaurar
                          </button>
                        )}
                        {!selectedCourierId && (
                          <Link
                            href={`/${locale}/settings/handling-costs/${hc.id}/edit`}
                            className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Editar
                          </Link>
                        )}
                        {!selectedCourierId && hc.is_active && (
                          <button
                            onClick={() => handleDeactivate(hc.id)}
                            disabled={isPending}
                            className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                          >
                            Desactivar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          />
        </table>
      </div>
    </div>
  );
}
