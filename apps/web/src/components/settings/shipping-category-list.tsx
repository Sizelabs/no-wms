"use client";

import { CARGO_TYPE_LABELS, CUSTOMS_DECLARATION_LABELS } from "@no-wms/shared/constants/shipping-categories";
import type { CargoType, CustomsDeclarationType } from "@no-wms/shared/constants/shipping-categories";
import { useOptimistic, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { ShippingCategoryModal } from "@/components/settings/shipping-category-modal";
import { useModalState } from "@/hooks/use-modal-state";
import { deleteShippingCategory } from "@/lib/actions/shipping-categories";

interface RequiredDoc {
  id: string;
  document_type: string;
  label: string;
  description: string | null;
  is_required: boolean;
}

interface ShippingCategoryRow {
  id: string;
  code: string;
  name: string;
  country_code: string;
  modality_id: string;
  description: string | null;
  cargo_type: string;
  max_weight_kg: number | null;
  min_declared_value_usd: number | null;
  max_declared_value_usd: number | null;
  customs_declaration_type: string;
  allows_dgr: boolean;
  requires_cedula: boolean;
  requires_ruc: boolean;
  country_specific_rules: Record<string, unknown>;
  is_active: boolean;
  display_order: number;
  modalities: { id: string; name: string; code: string } | null;
  shipping_category_required_documents: RequiredDoc[];
}

interface ShippingCategoryListProps {
  data: ShippingCategoryRow[];
  canCreate?: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function ShippingCategoryList({ data, canCreate = false, canUpdate, canDelete }: ShippingCategoryListProps) {
  const [search, setSearch] = useState("");
  const modal = useModalState<ShippingCategoryRow>();
  const [countryFilter, setCountryFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();
  const [optimisticData, setOptimistic] = useOptimistic(data);

  const countries = [...new Set(data.map((d) => d.country_code))].sort();
  const uniqueModalities = [...new Map(data.filter((d) => d.modalities).map((d) => [d.modalities!.id, d.modalities!])).values()];

  const filtered = optimisticData.filter((cat) => {
    if (countryFilter && cat.country_code !== countryFilter) return false;
    if (modalityFilter && cat.modalities?.id !== modalityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return cat.code.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDeactivate = (id: string) => {
    startTransition(async () => {
      setOptimistic((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: false } : c)));
      const result = await deleteShippingCategory(id);
      if (result.error) notify(result.error, "error");
      else notify("Categoría desactivada", "success");
    });
  };

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={modal.openCreate}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Categoría
          </button>
        </div>
      )}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        >
          <option value="">Todos los países</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={modalityFilter}
          onChange={(e) => setModalityFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        >
          <option value="">Todas las modalidades</option>
          {uniqueModalities.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">País</th>
              <th className="px-4 py-2">Modalidad</th>
              <th className="px-4 py-2">Tipo Carga</th>
              <th className="px-4 py-2">Límites</th>
              <th className="px-4 py-2">Aduanas</th>
              <th className="px-4 py-2">Docs</th>
              <th className="px-4 py-2">Estado</th>
              {(canUpdate || canDelete) && <th className="px-4 py-2">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  No hay categorías de envío
                </td>
              </tr>
            ) : (
              filtered.map((cat) => (
                <tr key={cat.id} className={cat.is_active ? "" : "opacity-50"}>
                  <td className="px-4 py-2">
                    <span className="inline-flex rounded bg-gray-900 px-1.5 py-0.5 text-xs font-bold text-white">
                      {cat.code}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-2">{cat.country_code}</td>
                  <td className="px-4 py-2">{cat.modalities?.name ?? "—"}</td>
                  <td className="px-4 py-2">{CARGO_TYPE_LABELS[cat.cargo_type as CargoType] ?? cat.cargo_type}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {cat.max_weight_kg && <span>Max {cat.max_weight_kg} kg</span>}
                    {cat.max_weight_kg && cat.max_declared_value_usd && " · "}
                    {cat.min_declared_value_usd && <span>${cat.min_declared_value_usd}</span>}
                    {cat.min_declared_value_usd && cat.max_declared_value_usd && "–"}
                    {cat.max_declared_value_usd && <span>${cat.max_declared_value_usd}</span>}
                  </td>
                  <td className="px-4 py-2">
                    {CUSTOMS_DECLARATION_LABELS[cat.customs_declaration_type as CustomsDeclarationType] ?? cat.customs_declaration_type}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {cat.shipping_category_required_documents?.filter((d) => d.is_required).length || 0}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cat.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {cat.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => modal.openEdit(cat)}
                            className="text-xs text-gray-600 hover:text-gray-900"
                          >
                            Editar
                          </button>
                        )}
                        {canDelete && cat.is_active && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(cat.id)}
                            disabled={isPending}
                            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ShippingCategoryModal
        key={modal.editItem?.id ?? "create"}
        open={modal.createOpen || !!modal.editItem}
        onClose={modal.close}
        item={modal.editItem}
      />
    </div>
  );
}
