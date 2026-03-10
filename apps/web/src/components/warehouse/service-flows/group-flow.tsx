"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import type { WrSummaryItem } from "./service-flow-wrapper";
import { ServiceFlowWrapper } from "./service-flow-wrapper";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { searchConsignees, quickCreateConsignee } from "@/lib/actions/consignees";
import {
  createShippingInstruction,
  getAgencyDestinations,
  getCourierCategories,
} from "@/lib/actions/shipping-instructions";
import { createWorkOrder } from "@/lib/actions/work-orders";

interface GroupFlowProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
}

interface Destination { id: string; city: string; state: string | null; country_code: string }
interface CourierCategory { id: string; code: string; name: string; max_weight_lb: number | null; max_value_usd: number | null; description: string | null }
interface ConsigneeResult { id: string; full_name: string; casillero: string | null; cedula_ruc: string | null; city: string | null }

export function GroupFlow({ open, onClose, onSuccess, wrs, warehouseId, agencyId }: GroupFlowProps) {
  const [autoShip, setAutoShip] = useState(false);
  const [instructions, setInstructions] = useState("");

  // Ship-form state (only when autoShip)
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destinationId, setDestinationId] = useState("");
  const [categories, setCategories] = useState<CourierCategory[]>([]);
  const [categoryCode, setCategoryCode] = useState("");
  const [consigneeQuery, setConsigneeQuery] = useState("");
  const [consigneeResults, setConsigneeResults] = useState<ConsigneeResult[]>([]);
  const [selectedConsignee, setSelectedConsignee] = useState<ConsigneeResult | null>(null);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);
  const [creatingConsignee, setCreatingConsignee] = useState(false);
  const [newConsigneeName, setNewConsigneeName] = useState("");
  const [insureCargo, setInsureCargo] = useState(false);
  const [isDgr, setIsDgr] = useState(() => wrs.some((wr) => wr.has_dgr_package));
  const [specialInstructions, setSpecialInstructions] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  // Cleanup debounce timer on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  useEffect(() => {
    if (!autoShip) return;
    getAgencyDestinations(agencyId).then((res) => { if (res.data) setDestinations(res.data); });
  }, [autoShip, agencyId]);

  useEffect(() => {
    if (!destinationId) { setCategories([]); setCategoryCode(""); return; }
    getCourierCategories(destinationId).then((res) => { if (res.data) setCategories(res.data); setCategoryCode(""); });
  }, [destinationId]);

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

  const canSubmit = !autoShip || (destinationId !== "" && selectedConsignee !== null);

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", "group");
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
      if (instructions) fd.set("instructions", instructions);
      fd.set("metadata", JSON.stringify({ auto_ship: autoShip }));

      const woResult = await createWorkOrder(fd);
      if ("error" in woResult) { notify(woResult.error, "error"); return; }

      if (autoShip && selectedConsignee) {
        const siFd = new FormData();
        siFd.set("warehouse_id", warehouseId);
        siFd.set("agency_id", agencyId);
        siFd.set("destination_id", destinationId);
        const dest = destinations.find((d) => d.id === destinationId);
        siFd.set("destination_city", dest?.city ?? "");
        siFd.set("modality", categoryCode ? `courier_${categoryCode.toLowerCase()}` : "air_cargo");
        if (categoryCode) siFd.set("courier_category", categoryCode);
        siFd.set("consignee_id", selectedConsignee.id);
        siFd.set("warehouse_receipt_ids", JSON.stringify(wrs.map((w) => w.id)));
        siFd.set("insure_cargo", String(insureCargo));
        siFd.set("is_dgr", String(isDgr));
        if (specialInstructions.trim()) siFd.set("special_instructions", specialInstructions.trim());

        const siResult = await createShippingInstruction(siFd);
        if ("error" in siResult) {
          notify(`Agrupacion creada, pero error en envio: ${siResult.error}`, "error");
          onSuccess();
          return;
        }
      }

      notify(autoShip ? "Agrupacion y envio creados" : "Solicitud de agrupacion creada", "success");
      onSuccess();
    });
  }

  return (
    <ServiceFlowWrapper
      open={open}
      onClose={onClose}
      title="Agrupar"
      size={autoShip ? "md" : "sm"}
      wrs={wrs}
      submitLabel={autoShip ? "Agrupar y Enviar" : "Solicitar Agrupacion"}
      submitDisabled={!canSubmit}
      submitting={isPending}
      onSubmit={handleSubmit}
    >
      <Field label="Instrucciones">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          className={textareaClass}
          placeholder="Instrucciones para la agrupacion..."
        />
      </Field>

      <Toggle checked={autoShip} onChange={setAutoShip} label="Generar envio automaticamente" />

      {autoShip && (
        <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
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
            {destinationId && categories.length > 0 && (
              <Field label="Categoria courier">
                <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className={selectClass}>
                  <option value="">Carga aerea (sin categoria)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.code}>{cat.code} — {cat.name}{cat.max_weight_lb ? ` (max ${cat.max_weight_lb} lb)` : ""}</option>
                  ))}
                </select>
              </Field>
            )}
          </fieldset>

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
                    <button key={c.id} type="button" onClick={() => handleSelectConsignee(c)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                      <span className="font-medium text-gray-900">{c.full_name}</span>
                      {c.casillero && <span className="text-xs text-gray-400">#{c.casillero}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!creatingConsignee ? (
              <button type="button" onClick={() => setCreatingConsignee(true)} className="text-xs text-gray-500 hover:text-gray-700">
                + Crear nuevo consignatario
              </button>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={newConsigneeName} onChange={(e) => setNewConsigneeName(e.target.value)} placeholder="Nombre completo" className={`flex-1 ${inputClass}`} />
                <button type="button" onClick={handleQuickCreate} disabled={!newConsigneeName.trim()} className="rounded-lg bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">Crear</button>
                <button type="button" onClick={() => { setCreatingConsignee(false); setNewConsigneeName(""); }} className="rounded-lg border border-gray-300 px-3 text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
              </div>
            )}
          </fieldset>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Toggle checked={insureCargo} onChange={setInsureCargo} label="Asegurar carga" />
            <Toggle checked={isDgr} onChange={setIsDgr} label="Mercancia peligrosa (DGR)" />
          </div>

          <Field label="Instrucciones de envio">
            <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} className={textareaClass} />
          </Field>
        </div>
      )}
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400" />
      {label}
    </label>
  );
}
