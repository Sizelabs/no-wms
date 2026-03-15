"use client";

import { useEffect, useState, useTransition } from "react";

import { useLocale } from "next-intl";
import Link from "next/link";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import type { UploadedFile } from "@/components/ui/file-upload";
import { FileUpload } from "@/components/ui/file-upload";
import { selectClass } from "@/components/ui/form-section";
import { cancelWorkOrdersForSi, checkWrWorkOrderConflicts, createShippingInstruction, getRouteModalities, getShippingCategories } from "@/lib/actions/shipping-instructions";

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

interface ModalityOption {
  id: string;
  name: string;
  code: string;
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
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [consigneeId, setConsigneeId] = useState(consignees[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? "");
  const [selectedWrs, setSelectedWrs] = useState<string[]>([]);
  const [cedulaRuc, setCedulaRuc] = useState("");
  const [cupo4x4, setCupo4x4] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Modality state
  const [availableModalities, setAvailableModalities] = useState<ModalityOption[]>([]);
  const [modalityId, setModalityId] = useState("");

  // Shipping categories state
  const [shippingCategories, setShippingCategories] = useState<ShippingCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Fetch available modalities when destination changes
  useEffect(() => {
    if (!destinationId) { setAvailableModalities([]); setModalityId(""); setShippingCategories([]); setSelectedCategoryId(""); return; }
    getRouteModalities(destinationId).then((res) => {
      const mods = res.data ?? [];
      setAvailableModalities(mods);
      setModalityId(mods.length === 1 ? mods[0]!.id : "");
      setShippingCategories([]);
      setSelectedCategoryId("");
    });
  }, [destinationId]);

  // Fetch categories when modality changes
  useEffect(() => {
    if (!destinationId || !modalityId) { setShippingCategories([]); setSelectedCategoryId(""); return; }
    const dest = destinations.find((d) => d.id === destinationId);
    if (!dest) return;
    getShippingCategories(dest.country_code, modalityId).then((res) => {
      if (res.data) setShippingCategories(res.data);
      setSelectedCategoryId("");
    });
  }, [modalityId, destinationId, destinations]);

  // Work order conflict state
  interface WoConflict {
    warehouse_receipt_id: string;
    wr_number: string;
    work_order_id: string;
    wo_number: string;
    wo_type: string;
    wo_status: string;
    cancellable: boolean;
  }
  const [woConflicts, setWoConflicts] = useState<WoConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Document upload state — keyed by document_type
  const [docUploads, setDocUploads] = useState<Record<string, UploadedFile[]>>({});

  // Auto-set cupo 4x4 and cedula/ruc requirements based on category
  const selectedCategory = shippingCategories.find((c) => c.id === selectedCategoryId);

  useEffect(() => {
    if (!selectedCategory) return;
    if (selectedCategory.country_specific_rules?.consumes_cupo_4x4) {
      setCupo4x4(true);
    }
  }, [selectedCategory]);

  // Reset uploaded files when category changes
  useEffect(() => { setDocUploads({}); }, [selectedCategoryId]);

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

  const submitSi = (wrIds: string[]) => {
    startTransition(async () => {
      const uploadedDocs = Object.entries(docUploads).flatMap(([docType, files]) =>
        files.map((f) => ({ document_type: docType, storage_path: f.storagePath, file_name: f.fileName, content_type: "", file_size: 0 })),
      );

      const fd = new FormData();
      fd.set("modality_id", modalityId);
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("consignee_id", consigneeId);
      fd.set("destination_id", destinationId);
      fd.set("shipping_category_id", selectedCategoryId);
      if (selectedCategory) fd.set("courier_category", selectedCategory.code);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrIds));
      if (cedulaRuc) fd.set("cedula_ruc", cedulaRuc);
      fd.set("cupo_4x4_used", String(cupo4x4));
      if (specialInstructions) fd.set("special_instructions", specialInstructions);
      if (uploadedDocs.length > 0) fd.set("documents", JSON.stringify(uploadedDocs));

      const res = await createShippingInstruction(fd);
      if ("error" in res) {
        notify(res.error, "error");
      } else {
        notify(
          <span>
            Instrucción de embarque{" "}
            <Link href={`/${locale}/shipping-instructions/${res.id}`} className="font-medium underline hover:text-gray-600">
              {res.si_number}
            </Link>{" "}
            creada
          </span>,
          "success",
        );
        setSelectedWrs([]);
        setSpecialInstructions("");
        setCedulaRuc("");
        setSelectedCategoryId("");
        setDocUploads({});
      }
    });
  };

  const handleSubmit = () => {
    if (!selectedWrs.length || !agencyId || !consigneeId || !destinationId || !modalityId || !selectedCategoryId) return;

    startTransition(async () => {
      const { conflicts } = await checkWrWorkOrderConflicts(selectedWrs);
      if (conflicts.length > 0) {
        setWoConflicts(conflicts);
        setShowConflictDialog(true);
      } else {
        submitSi(selectedWrs);
      }
    });
  };

  const handleResolveConflicts = () => {
    const cancellableWoIds = [...new Set(woConflicts.filter((c) => c.cancellable).map((c) => c.work_order_id))];
    const nonCancellableWrIds = new Set(woConflicts.filter((c) => !c.cancellable).map((c) => c.warehouse_receipt_id));
    const remainingWrs = selectedWrs.filter((id) => !nonCancellableWrIds.has(id));

    if (!remainingWrs.length) {
      notify("No quedan WRs disponibles después de remover los conflictos.", "error");
      setShowConflictDialog(false);
      setWoConflicts([]);
      return;
    }

    startTransition(async () => {
      if (cancellableWoIds.length > 0) {
        const cancelResult = await cancelWorkOrdersForSi(cancellableWoIds);
        if (cancelResult.error) {
          notify(cancelResult.error, "error");
          setShowConflictDialog(false);
          setWoConflicts([]);
          return;
        }
      }

      if (nonCancellableWrIds.size > 0) {
        setSelectedWrs(remainingWrs);
      }

      setShowConflictDialog(false);
      setWoConflicts([]);
      submitSi(remainingWrs);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        {/* Modality selector — appears after destination is picked */}
        {destinationId && availableModalities.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Modalidad <span className="text-red-400">*</span></label>
            <select
              value={modalityId}
              onChange={(e) => setModalityId(e.target.value)}
              className={`mt-1 ${selectClass}`}
            >
              {availableModalities.length > 1 && <option value="">Seleccionar modalidad...</option>}
              {availableModalities.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
        {destinationId && availableModalities.length === 0 && (
          <p className="text-sm text-amber-600 sm:col-span-2 lg:col-span-1">
            No hay modalidades configuradas para este destino.
          </p>
        )}
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
      {modalityId && shippingCategories.length > 0 && (
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
          {selectedCategory && selectedCategory.shipping_category_required_documents.filter((d) => d.is_required).length > 0 && (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-medium text-gray-700">Documentos requeridos</p>
              {selectedCategory.shipping_category_required_documents
                .filter((d) => d.is_required)
                .map((doc) => (
                  <div key={doc.id}>
                    <span className="mb-1 block text-sm text-gray-600">
                      {doc.label} <span className="text-red-400">*</span>
                    </span>
                    <FileUpload
                      bucket="si-documents"
                      folder={doc.document_type}
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxFiles={1}
                      onFilesChange={(files) => setDocUploads((prev) => ({ ...prev, [doc.document_type]: files }))}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
      {modalityId && shippingCategories.length === 0 && (
        <p className="text-sm text-amber-600">
          No hay categorías de envío configuradas para esta modalidad. Configúralas en Ajustes → Categorías de Envío.
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
          disabled={isPending || !selectedWrs.length || !agencyId || !consigneeId || !modalityId || !selectedCategoryId}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear Instrucción de Embarque"}
        </button>
      </div>

      {/* Work order conflict resolution dialog */}
      {showConflictDialog && woConflicts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="border-b px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                WRs con órdenes de trabajo activas
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Algunos WRs seleccionados tienen órdenes de trabajo en curso. Elija cómo proceder:
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto px-5 py-3">
              {(() => {
                const cancellable = woConflicts.filter((c) => c.cancellable);
                const nonCancellable = woConflicts.filter((c) => !c.cancellable);
                return (
                  <div className="space-y-3">
                    {cancellable.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                          Se cancelarán automáticamente
                        </p>
                        <div className="mt-1 space-y-1">
                          {cancellable.map((c) => (
                            <div key={`${c.warehouse_receipt_id}:${c.work_order_id}`} className="flex items-center justify-between rounded bg-amber-50 px-3 py-2 text-sm">
                              <span className="font-mono text-xs">{c.wr_number}</span>
                              <span className="text-xs text-gray-500">
                                OT {c.wo_number} ({c.wo_type}) — <span className="text-amber-700">Solicitada</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {nonCancellable.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                          Se removerán de la instrucción
                        </p>
                        <div className="mt-1 space-y-1">
                          {nonCancellable.map((c) => (
                            <div key={`${c.warehouse_receipt_id}:${c.work_order_id}`} className="flex items-center justify-between rounded bg-red-50 px-3 py-2 text-sm">
                              <span className="font-mono text-xs">{c.wr_number}</span>
                              <span className="text-xs text-gray-500">
                                OT {c.wo_number} ({c.wo_type}) — <span className="text-red-700 capitalize">{c.wo_status === "approved" ? "Aprobada" : "En progreso"}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <button
                type="button"
                onClick={() => { setShowConflictDialog(false); setWoConflicts([]); }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResolveConflicts}
                disabled={isPending}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isPending ? "Procesando..." : "Continuar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
