"use client";

import type { Modality } from "@no-wms/shared/constants/modalities";
import { MODALITY_LABELS, MVP_MODALITIES } from "@no-wms/shared/constants/modalities";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { selectClass } from "@/components/ui/form-section";
import { createShippingInstruction, getShippingCategories } from "@/lib/actions/shipping-instructions";

interface Agency {
  id: string;
  name: string;
  code: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Consignee {
  id: string;
  full_name: string;
}

interface Destination {
  id: string;
  city: string;
  country_code: string;
}

interface WrPackage {
  tracking_number: string;
  carrier: string | null;
}

interface WrOption {
  id: string;
  wr_number: string;
  status: string;
  total_billable_weight_lb: number | null;
  total_declared_value_usd: number | null;
  has_dgr_package: boolean | null;
  packages?: WrPackage[];
}

interface ShippingCategory {
  id: string;
  code: string;
  name: string;
  max_weight_kg: number | null;
  max_declared_value_usd: number | null;
  min_declared_value_usd: number | null;
  cargo_type: string;
  allows_dgr: boolean;
  requires_cedula: boolean;
  requires_ruc: boolean;
  customs_declaration_type: string;
  country_specific_rules: Record<string, unknown>;
  description: string | null;
  shipping_category_required_documents: Array<{ id: string; document_type: string; label: string; is_required: boolean }>;
}

interface SiCreateFormProps {
  agencies: Agency[];
  warehouses: Warehouse[];
  consignees: Consignee[];
  destinations: Destination[];
  availableWrs: WrOption[];
}

export function SiCreateForm({
  agencies,
  warehouses,
  consignees,
  destinations,
  availableWrs,
}: SiCreateFormProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [modality, setModality] = useState<Modality>("courier_a");
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [consigneeId, setConsigneeId] = useState(consignees[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? "");
  const [selectedWrs, setSelectedWrs] = useState<string[]>([]);
  const [cedulaRuc, setCedulaRuc] = useState("");
  const [cupo4x4, setCupo4x4] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Shipping categories state
  const [shippingCategories, setShippingCategories] = useState<ShippingCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Fetch categories when destination changes
  useEffect(() => {
    if (!destinationId) { setShippingCategories([]); setSelectedCategoryId(""); return; }
    const dest = destinations.find((d) => d.id === destinationId);
    if (!dest) return;
    getShippingCategories(dest.country_code).then((res) => {
      if (res.data) setShippingCategories(res.data);
      setSelectedCategoryId("");
    });
  }, [destinationId, destinations]);

  // Auto-set cupo 4x4 and cedula/ruc requirements based on category
  const selectedCategory = shippingCategories.find((c) => c.id === selectedCategoryId);

  useEffect(() => {
    if (!selectedCategory) return;
    if (selectedCategory.country_specific_rules?.consumes_cupo_4x4) {
      setCupo4x4(true);
    }
  }, [selectedCategory]);

  const filteredWrs = availableWrs.filter(
    (wr) => wr.status === "received" || wr.status === "in_warehouse",
  );

  const toggleWr = (wrId: string) => {
    setSelectedWrs((prev) =>
      prev.includes(wrId) ? prev.filter((id) => id !== wrId) : [...prev, wrId],
    );
  };

  const selectedWrData = filteredWrs.filter((wr) => selectedWrs.includes(wr.id));
  const totalWeight = selectedWrData.reduce((sum, wr) => sum + (wr.total_billable_weight_lb ?? 0), 0);
  const totalDeclared = selectedWrData.reduce((sum, wr) => sum + (wr.total_declared_value_usd ?? 0), 0);
  const hasDgr = selectedWrData.some((wr) => wr.has_dgr_package === true);

  const handleSubmit = () => {
    if (!selectedWrs.length || !agencyId || !consigneeId || !destinationId || !selectedCategoryId) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("modality", modality);
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("consignee_id", consigneeId);
      fd.set("destination_id", destinationId);
      fd.set("shipping_category_id", selectedCategoryId);
      if (selectedCategory) fd.set("courier_category", selectedCategory.code);
      fd.set("warehouse_receipt_ids", JSON.stringify(selectedWrs));
      if (cedulaRuc) fd.set("cedula_ruc", cedulaRuc);
      fd.set("cupo_4x4_used", String(cupo4x4));
      if (specialInstructions) fd.set("special_instructions", specialInstructions);

      const res = await createShippingInstruction(fd);
      if ("error" in res) {
        notify(res.error, "error");
      } else {
        notify("Instrucción de embarque creada", "success");
        setSelectedWrs([]);
        setSpecialInstructions("");
        setCedulaRuc("");
        setSelectedCategoryId("");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Modalidad</label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value as Modality)}
            className={`mt-1 ${selectClass}`}
          >
            {MVP_MODALITIES.map((m) => (
              <option key={m} value={m}>
                {MODALITY_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bodega</label>
          <div className="mt-1">
            <Combobox
              options={warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
              value={warehouseId}
              onChange={setWarehouseId}
              disabled={warehouses.length <= 1}
              placeholder="Seleccionar bodega"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Agencia</label>
          <div className="mt-1">
            <Combobox
              options={agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
              value={agencyId}
              onChange={setAgencyId}
              placeholder="Seleccionar agencia"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Destino</label>
          <div className="mt-1">
            <Combobox
              options={destinations.map((d) => ({ value: d.id, label: `${d.city} (${d.country_code})` }))}
              value={destinationId}
              onChange={setDestinationId}
              placeholder="Seleccionar destino"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Consignatario</label>
          <div className="mt-1">
            <Combobox
              options={consignees.map((c) => ({ value: c.id, label: c.full_name }))}
              value={consigneeId}
              onChange={setConsigneeId}
              placeholder="Seleccionar consignatario"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cédula / RUC
            {selectedCategory?.requires_cedula && <span className="ml-1 text-red-400">*</span>}
            {selectedCategory?.requires_ruc && <span className="ml-1 text-red-400">*</span>}
          </label>
          <input
            type="text"
            value={cedulaRuc}
            onChange={(e) => setCedulaRuc(e.target.value)}
            placeholder="10 o 13 dígitos"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Shipping Category selector */}
      {destinationId && shippingCategories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Categoría de Envío <span className="text-red-400">*</span>
          </label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shippingCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const totalWeightKg = totalWeight * 0.453592;
              const exceedsWeight = cat.max_weight_kg !== null && totalWeightKg > Number(cat.max_weight_kg);
              const exceedsValue = cat.max_declared_value_usd !== null && totalDeclared > Number(cat.max_declared_value_usd);
              const belowMinValue = cat.min_declared_value_usd !== null && totalDeclared < Number(cat.min_declared_value_usd);
              const dgrConflict = hasDgr && !cat.allows_dgr;
              const isDisabled = exceedsWeight || exceedsValue || belowMinValue || dgrConflict;

              return (
                <button
                  key={cat.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`relative rounded-lg border-2 p-3 text-left transition-colors ${
                    isSelected
                      ? "border-gray-900 bg-gray-50"
                      : isDisabled
                        ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-50"
                        : "border-gray-200 hover:border-gray-400"
                  }`}
                  title={
                    exceedsWeight ? `Excede peso máximo (${cat.max_weight_kg} kg)` :
                    exceedsValue ? `Excede valor máximo ($${cat.max_declared_value_usd})` :
                    belowMinValue ? `Valor mínimo: $${cat.min_declared_value_usd}` :
                    dgrConflict ? "No permite DGR — use Cat D" : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-gray-900 px-1.5 text-xs font-bold text-white">
                      {cat.code}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                    {cat.max_weight_kg && <span>Max {cat.max_weight_kg} kg</span>}
                    {cat.max_declared_value_usd && <span>Max ${cat.max_declared_value_usd}</span>}
                    {cat.min_declared_value_usd && <span>Min ${cat.min_declared_value_usd}</span>}
                    <span className="capitalize">{cat.customs_declaration_type}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gray-900" />
                  )}
                </button>
              );
            })}
          </div>
          {selectedCategory?.country_specific_rules?.consumes_cupo_4x4 === true && (
            <p className="mt-2 text-xs text-amber-600">Esta categoría consume cupo 4x4</p>
          )}
          {selectedCategory && selectedCategory.shipping_category_required_documents.length > 0 && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2">
              <p className="text-xs font-medium text-amber-800">Documentos requeridos para esta categoría:</p>
              <ul className="mt-1 list-inside list-disc text-xs text-amber-700">
                {selectedCategory.shipping_category_required_documents.filter((d) => d.is_required).map((d) => (
                  <li key={d.id}>{d.label}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {destinationId && shippingCategories.length === 0 && (
        <p className="text-sm text-amber-600">
          No hay categorías de envío configuradas para este destino. Configúralas en Ajustes → Categorías de Envío.
        </p>
      )}

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cupo4x4}
            onChange={(e) => setCupo4x4(e.target.checked)}
            className="rounded border-gray-300"
          />
          Cupo 4x4
        </label>
      </div>

      {/* WR selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Seleccionar WRs ({selectedWrs.length} seleccionados
          {selectedWrs.length > 0 && ` — ${totalWeight.toFixed(2)} lb · $${totalDeclared.toFixed(2)}`})
        </label>
        <div className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-white">
          {filteredWrs.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-gray-400">No hay WRs disponibles</p>
          ) : (
            filteredWrs.map((wr) => (
              <label
                key={wr.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedWrs.includes(wr.id)}
                  onChange={() => toggleWr(wr.id)}
                  className="rounded border-gray-300"
                />
                <span className="font-mono text-xs">{wr.wr_number}</span>
                <span className="text-xs text-gray-500">{wr.packages?.[0]?.tracking_number ?? ""}</span>
                <span className="text-xs text-gray-400">{wr.packages?.[0]?.carrier ?? ""}</span>
                {wr.has_dgr_package && <span className="rounded bg-red-100 px-1 text-[10px] font-medium text-red-700">DGR</span>}
                <span className="ml-auto text-xs text-gray-500">
                  {wr.total_billable_weight_lb ? `${wr.total_billable_weight_lb} lb` : "—"}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* DGR warning */}
      {hasDgr && selectedCategory && !selectedCategory.allows_dgr && (
        <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">
          Los WRs seleccionados contienen paquetes DGR. Seleccione la Categoría D para mercancía peligrosa.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Instrucciones especiales</label>
        <textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          placeholder="Instrucciones adicionales..."
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isPending || !selectedWrs.length || !agencyId || !consigneeId || !selectedCategoryId}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear Instrucción de Embarque"}
        </button>
      </div>
    </div>
  );
}
