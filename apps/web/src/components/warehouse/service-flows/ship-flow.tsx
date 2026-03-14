"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useLocale } from "next-intl";
import Link from "next/link";

import type { WrSummaryItem } from "./service-flow-wrapper";
import { ServiceFlowWrapper } from "./service-flow-wrapper";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import type { UploadedFile } from "@/components/ui/file-upload";
import { FileUpload } from "@/components/ui/file-upload";
import { searchConsignees, quickCreateConsignee } from "@/lib/actions/consignees";
import {
  createShippingInstruction,
  getAgencyDestinations,
  getRouteModalities,
  getShippingCategories,
} from "@/lib/actions/shipping-instructions";
import { patchWrDeclaredValues } from "@/lib/actions/warehouse-receipts";

interface ShipFlowProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
}

interface Destination { id: string; city: string; state: string | null; country_code: string }
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
interface ConsigneeResult { id: string; full_name: string; casillero: string | null; cedula_ruc: string | null; city: string | null }

interface ModalityOption { id: string; name: string; code: string }

export function ShipFlow({ open, onClose, onSuccess, wrs, warehouseId, agencyId }: ShipFlowProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destinationId, setDestinationId] = useState("");
  const [availableModalities, setAvailableModalities] = useState<ModalityOption[]>([]);
  const [modalityId, setModalityId] = useState("");
  const [categories, setCategories] = useState<ShippingCategory[]>([]);
  const [categoryCode, setCategoryCode] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Pre-fill consignee if all selected WRs share the same one
  const sharedConsignee = useMemo(() => {
    const first = wrs[0];
    if (!first?.consignee_id || !first.consignees) return null;
    const allSame = wrs.every((wr) => wr.consignee_id === first.consignee_id);
    if (!allSame) return null;
    return { id: first.consignee_id, full_name: first.consignees.full_name, casillero: first.consignees.casillero };
  }, [wrs]);

  const [consigneeQuery, setConsigneeQuery] = useState(
    () => sharedConsignee ? sharedConsignee.full_name + (sharedConsignee.casillero ? ` (${sharedConsignee.casillero})` : "") : "",
  );
  const [consigneeResults, setConsigneeResults] = useState<ConsigneeResult[]>([]);
  const [selectedConsignee, setSelectedConsignee] = useState<ConsigneeResult | null>(
    () => sharedConsignee ? { id: sharedConsignee.id, full_name: sharedConsignee.full_name, casillero: sharedConsignee.casillero, cedula_ruc: null, city: null } : null,
  );
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const [creatingConsignee, setCreatingConsignee] = useState(false);
  const [newConsigneeName, setNewConsigneeName] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Track uploaded files per required document type
  const [docUploads, setDocUploads] = useState<Record<string, UploadedFile[]>>({});

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  // Reset uploaded files when category changes
  useEffect(() => { setDocUploads({}); }, [selectedCategoryId]);

  // Track WRs with missing declared values — user fills them in before submission
  const wrsNeedingDeclaredValue = useMemo(
    () => wrs.filter((wr) => wr.total_declared_value_usd == null || wr.total_declared_value_usd <= 0),
    [wrs],
  );
  const [declaredValueOverrides, setDeclaredValueOverrides] = useState<Record<string, string>>({});
  const hasMissingData = wrsNeedingDeclaredValue.length > 0;
  const allMissingFilled = wrsNeedingDeclaredValue.every(
    (wr) => declaredValueOverrides[wr.id] && Number(declaredValueOverrides[wr.id]) > 0,
  );

  const [insureCargo, setInsureCargo] = useState(false);
  const [isDgr, setIsDgr] = useState(() => wrs.some((wr) => wr.has_dgr_package));
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();
  const locale = useLocale();

  useEffect(() => {
    getAgencyDestinations(agencyId).then((res) => { if (res.data) setDestinations(res.data); });
  }, [agencyId]);

  useEffect(() => {
    if (!destinationId) { setAvailableModalities([]); setModalityId(""); setCategories([]); setCategoryCode(""); setSelectedCategoryId(""); return; }
    getRouteModalities(destinationId).then((res) => {
      const mods = res.data ?? [];
      setAvailableModalities(mods);
      setModalityId(mods.length === 1 ? mods[0]!.id : "");
      setCategories([]); setCategoryCode(""); setSelectedCategoryId("");
    });
  }, [destinationId]);

  useEffect(() => {
    if (!destinationId || !modalityId) { setCategories([]); setCategoryCode(""); setSelectedCategoryId(""); return; }
    const dest = destinations.find((d) => d.id === destinationId);
    if (!dest) return;
    getShippingCategories(dest.country_code, modalityId).then((res) => { if (res.data) setCategories(res.data); setCategoryCode(""); setSelectedCategoryId(""); });
  }, [modalityId, destinationId, destinations]);

  const handleConsigneeSearch = useCallback((query: string) => {
    setConsigneeQuery(query);
    setSelectedConsignee(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setConsigneeResults([]); setShowConsigneeDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await searchConsignees(agencyId, query.trim());
      if (res.data) { setConsigneeResults(res.data); setShowConsigneeDropdown(true); }
    }, 300);
  }, [agencyId]);

  const handleSelectConsignee = useCallback((c: ConsigneeResult) => {
    setSelectedConsignee(c);
    setConsigneeQuery(c.full_name + (c.casillero ? ` (${c.casillero})` : ""));
    setShowConsigneeDropdown(false);
  }, []);

  const handleQuickCreate = useCallback(async () => {
    if (!newConsigneeName.trim()) return;
    const fd = new FormData();
    fd.set("agency_id", agencyId);
    fd.set("full_name", newConsigneeName.trim());
    const res = await quickCreateConsignee(fd);
    if (res.data) {
      setSelectedConsignee({ id: res.data.id, full_name: res.data.full_name, casillero: res.data.casillero, cedula_ruc: null, city: null });
      setConsigneeQuery(res.data.full_name + (res.data.casillero ? ` (${res.data.casillero})` : ""));
      setCreatingConsignee(false);
      setNewConsigneeName("");
      notify("Consignatario creado", "success");
    } else {
      notify(res.error ?? "Error creando consignatario", "error");
    }
  }, [agencyId, newConsigneeName, notify]);

  const canSubmit = destinationId !== "" && modalityId !== "" && selectedConsignee !== null && selectedCategoryId !== "" && (!hasMissingData || allMissingFilled);

  function handleSubmit() {
    if (!selectedConsignee) return;
    const dest = destinations.find((d) => d.id === destinationId);
    startTransition(async () => {
      // Patch missing declared values if user filled them in
      if (wrsNeedingDeclaredValue.length > 0) {
        const patches = wrsNeedingDeclaredValue
          .filter((wr) => declaredValueOverrides[wr.id])
          .map((wr) => ({ wrId: wr.id, declaredValueUsd: Number(declaredValueOverrides[wr.id]) }));
        if (patches.length > 0) {
          const patchResult = await patchWrDeclaredValues(patches);
          if (patchResult.error) {
            notify(patchResult.error, "error");
            return;
          }
        }
      }

      // Collect already-uploaded document metadata
      const uploadedDocs = Object.entries(docUploads).flatMap(([docType, files]) =>
        files.map((f) => ({ document_type: docType, storage_path: f.storagePath, file_name: f.fileName, content_type: "", file_size: 0 })),
      );

      const fd = new FormData();
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("destination_id", destinationId);
      fd.set("destination_city", dest?.city ?? "");
      fd.set("modality_id", modalityId);
      if (categoryCode) fd.set("courier_category", categoryCode);
      if (selectedCategoryId) fd.set("shipping_category_id", selectedCategoryId);
      fd.set("consignee_id", selectedConsignee.id);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
      fd.set("insure_cargo", String(insureCargo));
      fd.set("is_dgr", String(isDgr));
      if (specialInstructions.trim()) fd.set("special_instructions", specialInstructions.trim());
      if (uploadedDocs.length > 0) fd.set("documents", JSON.stringify(uploadedDocs));

      const result = await createShippingInstruction(fd);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify(
          <span>
            Instrucción de envío{" "}
            <Link href={`/${locale}/shipping-instructions/${result.id}`} className="font-medium underline hover:text-gray-600">
              {result.si_number}
            </Link>{" "}
            creada
          </span>,
          "success",
        );
        onSuccess();
      }
    });
  }

  return (
    <ServiceFlowWrapper
      open={open}
      onClose={onClose}
      title="Enviar"
      size="md"
      wrs={wrs}
      submitLabel="Solicitar Envio"
      submitDisabled={!canSubmit}
      submitting={isPending}
      onSubmit={handleSubmit}
    >
      {/* Missing data warning */}
      {hasMissingData && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
          <p className="text-sm font-medium text-amber-800">
            {wrsNeedingDeclaredValue.length === 1
              ? "1 recibo no tiene valor declarado"
              : `${wrsNeedingDeclaredValue.length} recibos no tienen valor declarado`}
          </p>
          <p className="text-xs text-amber-600">Ingrese el valor declarado (USD) para cada recibo antes de continuar.</p>
          <div className="space-y-2">
            {wrsNeedingDeclaredValue.map((wr) => (
              <div key={wr.id} className="flex items-center gap-3">
                <span className="shrink-0 font-mono text-xs font-medium text-amber-900">{wr.wr_number}</span>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-amber-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={declaredValueOverrides[wr.id] ?? ""}
                    onChange={(e) => setDeclaredValueOverrides((prev) => ({ ...prev, [wr.id]: e.target.value }))}
                    className="h-8 w-full rounded-md border border-amber-300 bg-white pl-6 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Destination */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">Destino</legend>
        <Field label="Destino" required>
          <Combobox
            options={destinations.map((d) => ({
              value: d.id,
              label: `${d.city}${d.state ? `, ${d.state}` : ""} (${d.country_code})`,
            }))}
            value={destinationId}
            onChange={setDestinationId}
            placeholder="Seleccionar..."
            required
          />
        </Field>
        {destinationId && availableModalities.length > 0 && (
          <Field label="Modalidad" required>
            <select
              value={modalityId}
              onChange={(e) => setModalityId(e.target.value)}
              className={selectClass}
            >
              {availableModalities.length > 1 && <option value="">Seleccionar modalidad...</option>}
              {availableModalities.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>
        )}
        {modalityId && categories.length > 0 && (
          <Field label="Categoría de envío" required>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                const cat = categories.find((c) => c.id === e.target.value);
                setCategoryCode(cat?.code ?? "");
              }}
              className={selectClass}
            >
              <option value="">Seleccionar categoría...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.code} — {cat.name}{cat.max_weight_kg ? ` (max ${cat.max_weight_kg} kg)` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        {modalityId && categories.length === 0 && (
          <p className="text-xs text-amber-600">
            No hay categorías de envío configuradas para esta modalidad. Configúralas en Ajustes → Categorías de Envío.
          </p>
        )}
        {selectedCategory && selectedCategory.shipping_category_required_documents.filter((d) => d.is_required).length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">Documentos requeridos</legend>
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
          </fieldset>
        )}
      </fieldset>

      {/* Consignee */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">Consignatario</legend>
        <div className="relative">
          <input
            type="text"
            value={consigneeQuery}
            onChange={(e) => handleConsigneeSearch(e.target.value)}
            onFocus={() => { if (consigneeResults.length > 0 && !selectedConsignee) setShowConsigneeDropdown(true); }}
            placeholder="Buscar por nombre o casillero..."
            className={inputClass}
          />
          {showConsigneeDropdown && consigneeResults.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-lg border bg-white py-1 shadow-lg">
              {consigneeResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectConsignee(c)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{c.full_name}</span>
                  {c.casillero && <span className="text-xs text-gray-400">#{c.casillero}</span>}
                </button>
              ))}
            </div>
          )}
          {showConsigneeDropdown && consigneeResults.length === 0 && consigneeQuery.trim().length >= 2 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white px-3 py-2 shadow-lg">
              <p className="text-xs text-gray-500">Sin resultados</p>
            </div>
          )}
        </div>
        {!creatingConsignee ? (
          <button type="button" onClick={() => setCreatingConsignee(true)} className="text-xs text-gray-500 hover:text-gray-700">
            + Crear nuevo consignatario
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={newConsigneeName}
              onChange={(e) => setNewConsigneeName(e.target.value)}
              placeholder="Nombre completo"
              className={`flex-1 ${inputClass}`}
            />
            <button type="button" onClick={handleQuickCreate} disabled={!newConsigneeName.trim()} className="rounded-lg bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              Crear
            </button>
            <button type="button" onClick={() => { setCreatingConsignee(false); setNewConsigneeName(""); }} className="rounded-lg border border-gray-300 px-3 text-xs text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        )}
      </fieldset>

      {/* Options */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Toggle checked={insureCargo} onChange={setInsureCargo} label="Asegurar carga" />
        <Toggle checked={isDgr} onChange={setIsDgr} label="Mercancia peligrosa (DGR)" />
      </div>

      {/* Instructions */}
      <Field label="Instrucciones especiales">
        <textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={2}
          className={textareaClass}
        />
      </Field>
    </ServiceFlowWrapper>
  );
}

/* ── Shared primitives ─────────────────────────────────────────────────── */

const baseClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors";
const inputClass = `h-10 ${baseClass}`;
const selectClass = `h-10 ${baseClass}`;
const textareaClass = `py-2 ${baseClass}`;

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
      />
      {label}
    </label>
  );
}
