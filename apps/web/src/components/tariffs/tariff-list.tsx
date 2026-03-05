"use client";

import { MODALITY_LABELS } from "@no-wms/shared/constants/modalities";
import { TARIFF_SIDE_LABELS, type TariffSide } from "@no-wms/shared/constants/tariff";
import { WORK_ORDER_TYPE_LABELS, type WorkOrderType } from "@no-wms/shared/constants/work-order-types";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { filterSelectClass } from "@/components/ui/form-section";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { deleteTariffSchedule } from "@/lib/actions/tariffs";

interface TariffSchedule {
  id: string;
  tariff_side: string;
  tariff_type: string;
  courier_id: string | null;
  agency_id: string | null;
  modality: string | null;
  work_order_type: string | null;
  base_fee: number;
  weight_unit: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  couriers: { id: string; name: string; code: string } | null;
  agencies: { id: string; name: string; code: string } | null;
  destinations: { id: string; city: string; country_code: string } | null;
  shipping_categories: { id: string; code: string; name: string } | null;
  tariff_brackets: { id: string }[];
}

interface TariffListProps {
  data: TariffSchedule[];
}

export function TariffList({ data }: TariffListProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = data.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        t.couriers?.name?.toLowerCase().includes(q) ||
        t.agencies?.name?.toLowerCase().includes(q) ||
        t.destinations?.city?.toLowerCase().includes(q) ||
        t.modality?.toLowerCase().includes(q) ||
        t.work_order_type?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (sideFilter && t.tariff_side !== sideFilter) return false;
    if (typeFilter && t.tariff_type !== typeFilter) return false;
    if (activeFilter === "true" && !t.is_active) return false;
    if (activeFilter === "false" && t.is_active) return false;
    return true;
  });

  const handleDeactivate = (id: string) => {
    if (!confirm("¿Desactivar esta tarifa?")) return;
    startTransition(async () => {
      const result = await deleteTariffSchedule(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify("Tarifa desactivada", "success");
      }
    });
  };

  const getCustomerLabel = (t: TariffSchedule) => {
    if (t.tariff_side === "forwarder_to_courier") {
      return t.couriers ? `${t.couriers.name}` : "Base (todos)";
    }
    if (t.agency_id && t.agencies) {
      return `${t.agencies.name}`;
    }
    return "Base (todas)";
  };

  const getDimensionLabel = (t: TariffSchedule) => {
    if (t.tariff_type === "work_order") {
      return WORK_ORDER_TYPE_LABELS[t.work_order_type as WorkOrderType] ?? t.work_order_type;
    }
    const parts: string[] = [];
    if (t.destinations) parts.push(`${t.destinations.city} (${t.destinations.country_code})`);
    if (t.modality) parts.push(MODALITY_LABELS[t.modality as keyof typeof MODALITY_LABELS] ?? t.modality);
    if (t.shipping_categories) parts.push(`Cat. ${t.shipping_categories.code}`);
    return parts.join(" / ") || "—";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar courier, agencia, destino..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={sideFilter}
          onChange={(e) => setSideFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los lados</option>
          {Object.entries(TARIFF_SIDE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los tipos</option>
          <option value="shipping">Envío</option>
          <option value="work_order">Orden de Trabajo</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los estados</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
      </div>

      <div ref={scrollRef} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Lado</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Dimensión</th>
              <th className="px-4 py-3">Rangos</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Vigente desde</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollRef={scrollRef}
            colSpan={8}
            emptyMessage="No hay tarifas configuradas"
            renderRow={(t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-xs">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.tariff_side === "forwarder_to_courier"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-purple-50 text-purple-700"
                  }`}>
                    {TARIFF_SIDE_LABELS[t.tariff_side as TariffSide] ?? t.tariff_side}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {t.tariff_side === "courier_to_agency" && t.couriers && (
                    <span className="text-gray-400">{t.couriers.code} → </span>
                  )}
                  {getCustomerLabel(t)}
                </td>
                <td className="px-4 py-3 text-xs">
                  {t.tariff_type === "shipping" ? "Envío" : "OT"}
                </td>
                <td className="px-4 py-3 text-xs">{getDimensionLabel(t)}</td>
                <td className="px-4 py-3 text-xs">
                  {t.tariff_brackets?.length ?? 0}
                  {Number(t.base_fee) > 0 && (
                    <span className="ml-1 text-gray-400">+ ${Number(t.base_fee).toFixed(2)}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {new Date(t.effective_from).toLocaleDateString("es")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Link
                      href={`tariffs/${t.id}`}
                      className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`tariffs/${t.id}/edit`}
                      className="rounded border px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    {t.is_active && (
                      <button
                        onClick={() => handleDeactivate(t.id)}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        Desactivar
                      </button>
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
