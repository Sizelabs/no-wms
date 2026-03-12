"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { checkboxClass, Field, inputClass, selectClass, textareaClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Combobox } from "@/components/ui/combobox";
import { searchConsignees, quickCreateConsignee } from "@/lib/actions/consignees";
import {
  createShippingInstruction,
  getAvailableHouseBillsForShipping,
  getAgencyDestinations,
  getShippingCategories,
} from "@/lib/actions/shipping-instructions";

interface HouseBillWr {
  id: string;
  wr_number: string;
  warehouse_id: string;
  agency_id: string | null;
  consignee_id: string | null;
  total_billable_weight_lb: number | null;
  total_declared_value_usd: number | null;
  total_packages: number;
  total_pieces: number;
  has_dgr_package: boolean;
  has_damaged_package: boolean;
  consignees: { full_name: string; casillero: string | null } | null;
}

interface AvailableHouseBill {
  id: string;
  hawb_number: string;
  document_type: string;
  warehouse_receipts: HouseBillWr[];
}

interface Destination { id: string; city: string; state: string | null; country_code: string }
interface ShippingCategory {
  id: string;
  code: string;
  name: string;
  max_weight_kg: number | null;
  max_declared_value_usd: number | null;
  description: string | null;
}
interface ConsigneeResult { id: string; full_name: string; casillero: string | null; cedula_ruc: string | null; city: string | null }

const DOC_TYPE_LABELS: Record<string, string> = {
  hawb: "HAWB",
  hbl: "HBL",
  hwb: "HWB",
};

export function CreateShipmentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        + Embarque
      </button>
      {open && <CreateShipmentModal onClose={() => setOpen(false)} />}
    </>
  );
}

function CreateShipmentModal({ onClose }: { onClose: () => void }) {
  const [houseBills, setHouseBills] = useState<AvailableHouseBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Ship form state
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destinationId, setDestinationId] = useState("");
  const [categories, setCategories] = useState<ShippingCategory[]>([]);
  const [categoryCode, setCategoryCode] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [consigneeQuery, setConsigneeQuery] = useState("");
  const [consigneeResults, setConsigneeResults] = useState<ConsigneeResult[]>([]);
  const [selectedConsignee, setSelectedConsignee] = useState<ConsigneeResult | null>(null);
  const [creatingConsignee, setCreatingConsignee] = useState(false);
  const [newConsigneeName, setNewConsigneeName] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [insureCargo, setInsureCargo] = useState(false);
  const [isDgr, setIsDgr] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  // Fetch house bills on mount
  useEffect(() => {
    getAvailableHouseBillsForShipping().then((res) => {
      setHouseBills((res.data ?? []) as unknown as AvailableHouseBill[]);
      setLoading(false);
    });
  }, []);

  // Derive WRs from selected house bills
  const selectedHouseBills = useMemo(() => houseBills.filter((hb) => selected.has(hb.id)), [houseBills, selected]);
  const selectedWrs = useMemo(() => selectedHouseBills.flatMap((hb) => hb.warehouse_receipts), [selectedHouseBills]);
  const firstWr = selectedWrs[0];
  const agencyId = firstWr?.agency_id ?? "";
  const warehouseId = firstWr?.warehouse_id ?? "";

  // Fetch agency destinations when selection changes
  useEffect(() => {
    if (!agencyId) { setDestinations([]); setDestinationId(""); return; }
    getAgencyDestinations(agencyId).then((res) => { if (res.data) setDestinations(res.data); });
  }, [agencyId]);

  // Fetch shipping categories when destination changes
  useEffect(() => {
    if (!destinationId) { setCategories([]); setCategoryCode(""); setSelectedCategoryId(""); return; }
    const dest = destinations.find((d) => d.id === destinationId);
    if (!dest) return;
    getShippingCategories(dest.country_code).then((res) => { if (res.data) setCategories(res.data); setCategoryCode(""); setSelectedCategoryId(""); });
  }, [destinationId, destinations]);

  // Pre-fill consignee when all selected house bills share the same one
  const prevSelectedRef = useRef(selected);
  useEffect(() => {
    if (prevSelectedRef.current === selected) return;
    prevSelectedRef.current = selected;
    if (selected.size === 0) return;
    const allWrs = selectedHouseBills.flatMap((hb) => hb.warehouse_receipts);
    const first = allWrs[0];
    if (!first?.consignee_id || !first.consignees) return;
    const allSame = allWrs.every((wr) => wr.consignee_id === first.consignee_id);
    if (!allSame) return;
    setSelectedConsignee({ id: first.consignee_id, full_name: first.consignees.full_name, casillero: first.consignees.casillero, cedula_ruc: null, city: null });
    setConsigneeQuery(first.consignees.full_name + (first.consignees.casillero ? ` (${first.consignees.casillero})` : ""));
  }, [selected, selectedHouseBills]);

  // Cleanup debounce timer on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const toggleHouseBill = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalWeight = useMemo(() => selectedWrs.reduce((sum, wr) => sum + (Number(wr.total_billable_weight_lb) || 0), 0), [selectedWrs]);
  const totalPackages = useMemo(() => selectedWrs.reduce((sum, wr) => sum + (wr.total_packages || 0), 0), [selectedWrs]);

  const consigneeDropdownOpen = !selectedConsignee && consigneeQuery.trim().length >= 2;

  const handleConsigneeSearch = useCallback((query: string) => {
    setConsigneeQuery(query);
    setSelectedConsignee(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setConsigneeResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      if (!agencyId) return;
      const res = await searchConsignees(agencyId, query.trim());
      if (res.data) setConsigneeResults(res.data);
    }, 300);
  }, [agencyId]);

  const handleSelectConsignee = useCallback((c: ConsigneeResult) => {
    setSelectedConsignee(c);
    setConsigneeQuery(c.full_name + (c.casillero ? ` (${c.casillero})` : ""));
  }, []);

  const handleQuickCreate = useCallback(async () => {
    if (!newConsigneeName.trim() || !agencyId) return;
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

  const canSubmit = selected.size > 0 && destinationId !== "" && selectedConsignee !== null && selectedCategoryId !== "";

  function handleSubmit() {
    if (!selectedConsignee) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("destination_id", destinationId);
      const dest = destinations.find((d) => d.id === destinationId);
      fd.set("destination_city", dest?.city ?? "");
      fd.set("modality", categoryCode ? `courier_${categoryCode.toLowerCase()}` : "air_cargo");
      if (categoryCode) fd.set("courier_category", categoryCode);
      if (selectedCategoryId) fd.set("shipping_category_id", selectedCategoryId);
      fd.set("consignee_id", selectedConsignee.id);
      // Derive WR IDs from selected house bills
      const wrIds = selectedHouseBills.flatMap((hb) => hb.warehouse_receipts.map((wr) => wr.id));
      fd.set("warehouse_receipt_ids", JSON.stringify(wrIds));
      fd.set("insure_cargo", String(insureCargo));
      fd.set("is_dgr", String(isDgr));
      if (specialInstructions.trim()) fd.set("special_instructions", specialInstructions.trim());

      const result = await createShippingInstruction(fd);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Instruccion de envio creada", "success");
        onClose();
      }
    });
  }

  return (
    <Modal open onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>Enviar</ModalHeader>
      <ModalBody>
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Cargando guías...</p>
        ) : (
          <div className="space-y-4">
            {/* House bill selection */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Guías {selected.size > 0 && (
                  <span className="normal-case text-gray-600">
                    — {selected.size} sel. · {totalPackages} paq. · {totalWeight.toFixed(1)} lb
                  </span>
                )}
              </legend>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {houseBills.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-gray-400">No hay guías disponibles</p>
                ) : (
                  houseBills.map((hb) => {
                    const hbWeight = hb.warehouse_receipts.reduce((s, wr) => s + (Number(wr.total_billable_weight_lb) || 0), 0);
                    const hbPackages = hb.warehouse_receipts.reduce((s, wr) => s + (wr.total_packages || 0), 0);
                    const consignee = hb.warehouse_receipts[0]?.consignees;
                    return (
                      <label
                        key={hb.id}
                        className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(hb.id)}
                          onChange={() => toggleHouseBill(hb.id)}
                          className={checkboxClass}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium text-gray-900">{hb.hawb_number}</span>
                            <span className="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-medium text-gray-500">
                              {DOC_TYPE_LABELS[hb.document_type] ?? hb.document_type}
                            </span>
                          </div>
                          {consignee && (
                            <span className="text-[11px] text-gray-500">
                              {consignee.full_name}{consignee.casillero ? ` #${consignee.casillero}` : ""}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-right text-xs text-gray-500">
                          {hb.warehouse_receipts.length} WR · {hbPackages} paq. · {hbWeight.toFixed(1)} lb
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </fieldset>

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
                  placeholder={agencyId ? "Seleccionar..." : "Seleccione guías primero..."}
                  disabled={!agencyId}
                  required
                />
              </Field>
              {destinationId && categories.length > 0 && (
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
              {destinationId && categories.length === 0 && (
                <p className="text-xs text-amber-600">
                  No hay categorías de envío configuradas para este destino. Configúralas en Ajustes → Categorías de Envío.
                </p>
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
                  placeholder={selected.size === 0 ? "Seleccione guías primero..." : "Buscar por nombre o casillero..."}
                  disabled={selected.size === 0}
                  className={inputClass}
                />
                {consigneeDropdownOpen && consigneeResults.length > 0 && (
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
                {consigneeDropdownOpen && consigneeResults.length === 0 && (
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
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Procesando..." : "Solicitar Envio"}
        </button>
      </ModalFooter>
    </Modal>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={checkboxClass}
      />
      {label}
    </label>
  );
}
