"use client";

import { CARRIERS } from "@no-wms/shared/constants/carriers";
import {
  calculateBillableWeight,
  calculateVolumetricWeight,
} from "@no-wms/shared/validators/warehouse-receipt";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { UploadedPhoto } from "@/components/ui/photo-upload";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { quickCreateConsignee, searchConsignees } from "@/lib/actions/consignees";
import { checkDuplicateTracking, createWarehouseReceipt } from "@/lib/actions/warehouse-receipts";

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

interface WarehouseLocation {
  id: string;
  zone_name: string | null;
  location_code: string;
}

interface Consignee {
  id: string;
  full_name: string;
  cedula_ruc: string | null;
  city: string | null;
}

interface WrReceiptFormProps {
  agencies: Agency[];
  warehouses: Warehouse[];
  warehouseLocations?: WarehouseLocation[];
  locale: string;
}

type Step =
  | "agency"
  | "tracking"
  | "carrier"
  | "weight"
  | "photos"
  | "consignee"
  | "details"
  | "confirm";

const STEPS: Step[] = [
  "agency",
  "tracking",
  "carrier",
  "weight",
  "photos",
  "consignee",
  "details",
  "confirm",
];

const STEP_LABELS: Record<Step, string> = {
  agency: "Agencia",
  tracking: "Guía",
  carrier: "Transportista",
  weight: "Peso / Dimensiones",
  photos: "Fotos",
  consignee: "Destinatario",
  details: "Detalles",
  confirm: "Confirmar",
};

export function WrReceiptForm({ agencies, warehouses, warehouseLocations = [], locale }: WrReceiptFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [step, setStep] = useState<Step>("agency");
  const [error, setError] = useState<string | null>(null);
  const [createdWr, setCreatedWr] = useState<{ id: string; wr_number: string } | null>(null);

  // Field values
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [agencyId, setAgencyId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [actualWeight, setActualWeight] = useState("");
  const [lengthIn, setLengthIn] = useState("");
  const [widthIn, setWidthIn] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [consigneeId, setConsigneeId] = useState("");
  const [consigneeSearch, setConsigneeSearch] = useState("");
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [piecesCount, setPiecesCount] = useState("1");
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageDescription, setDamageDescription] = useState("");
  const [isDgr, setIsDgr] = useState(false);
  const [notes, setNotes] = useState("");
  const [senderName, setSenderName] = useState("");
  const [warehouseLocationId, setWarehouseLocationId] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  // Quick-create consignee
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newConsigneeName, setNewConsigneeName] = useState("");
  const [creatingConsignee, setCreatingConsignee] = useState(false);

  // Duplicate check state
  const [duplicateInfo, setDuplicateInfo] = useState<{
    wr_number: string;
    received_at: string;
  } | null>(null);

  // Refs
  const trackingRef = useRef<HTMLInputElement>(null);

  // Computed values
  const volumetricWeight = useMemo(() => {
    const l = parseFloat(lengthIn);
    const w = parseFloat(widthIn);
    const h = parseFloat(heightIn);
    if (l > 0 && w > 0 && h > 0) {
      return calculateVolumetricWeight(l, w, h, 166);
    }
    return null;
  }, [lengthIn, widthIn, heightIn]);

  const billableWeight = useMemo(() => {
    const actual = parseFloat(actualWeight) || null;
    return calculateBillableWeight(actual, volumetricWeight);
  }, [actualWeight, volumetricWeight]);

  const selectedAgency = useMemo(
    () => agencies.find((a) => a.id === agencyId),
    [agencies, agencyId],
  );

  const selectedConsignee = useMemo(
    () => consignees.find((c) => c.id === consigneeId),
    [consignees, consigneeId],
  );

  const isUnknownAgency = agencyId === "unknown";
  const activeSteps = useMemo(
    () => (isUnknownAgency ? STEPS.filter((s) => s !== "consignee") : STEPS),
    [isUnknownAgency],
  );
  const stepIndex = activeSteps.indexOf(step);

  // Consignee search
  useEffect(() => {
    if (!agencyId || consigneeSearch.length < 2) {
      setConsignees([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const result = await searchConsignees(agencyId, consigneeSearch);
      if (result.data) {
        setConsignees(result.data);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [agencyId, consigneeSearch]);

  // Focus tracking input when step changes
  useEffect(() => {
    if (step === "tracking") {
      trackingRef.current?.focus();
    }
  }, [step]);

  const goNext = useCallback(() => {
    const idx = activeSteps.indexOf(step);
    if (idx < activeSteps.length - 1) {
      setStep(activeSteps[idx + 1]!);
      setError(null);
    }
  }, [step, activeSteps]);

  const goBack = useCallback(() => {
    const idx = activeSteps.indexOf(step);
    if (idx > 0) {
      setStep(activeSteps[idx - 1]!);
      setError(null);
    }
  }, [step, activeSteps]);

  // Validate and advance from tracking step
  const handleTrackingNext = useCallback(async () => {
    if (!trackingNumber.trim()) {
      setError("Ingrese el número de guía");
      return;
    }

    setError(null);
    const duplicate = await checkDuplicateTracking(trackingNumber.trim());

    if (duplicate) {
      setDuplicateInfo(duplicate);
      setError(
        `Esta guía ya fue recibida el ${new Date(duplicate.received_at).toLocaleDateString("es")}.`,
      );
      return;
    }

    setDuplicateInfo(null);
    goNext();
  }, [trackingNumber, goNext]);

  // Quick-create consignee handler
  const handleQuickCreate = useCallback(async () => {
    if (!newConsigneeName.trim()) return;
    setCreatingConsignee(true);
    const fd = new FormData();
    fd.set("agency_id", agencyId);
    fd.set("full_name", newConsigneeName.trim());
    const result = await quickCreateConsignee(fd);
    if (result.data) {
      setConsigneeId(result.data.id);
      setConsigneeSearch(result.data.full_name);
      setConsignees((prev) => [...prev, { id: result.data!.id, full_name: result.data!.full_name, cedula_ruc: null, city: null }]);
      setShowQuickCreate(false);
      setNewConsigneeName("");
    } else {
      setError(result.error ?? "Error al crear destinatario");
    }
    setCreatingConsignee(false);
  }, [agencyId, newConsigneeName]);

  // Reset form for "Register Another Box"
  const resetForAnother = useCallback(() => {
    // Keep warehouse and agency, reset everything else
    setTrackingNumber("");
    setCarrier("");
    setActualWeight("");
    setLengthIn("");
    setWidthIn("");
    setHeightIn("");
    setConsigneeId("");
    setConsigneeSearch("");
    setConsignees([]);
    setPiecesCount("1");
    setIsDamaged(false);
    setDamageDescription("");
    setIsDgr(false);
    setNotes("");
    setSenderName("");
    setWarehouseLocationId("");
    setPhotos([]);
    setDuplicateInfo(null);
    setCreatedWr(null);
    setError(null);
    setStep("tracking");
  }, []);

  // Submit
  const handleSubmit = useCallback(() => {
    // Validate photo count
    const minRequired = isDamaged ? 3 : 1;
    if (photos.length < minRequired) {
      setError(isDamaged ? "Se requieren mínimo 3 fotos para paquetes dañados" : "Se requiere al menos 1 foto");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("warehouse_id", warehouseId);
        if (agencyId !== "unknown") {
          formData.set("agency_id", agencyId);
        }
        formData.set("tracking_number", trackingNumber.trim());
        formData.set("carrier", carrier);
        if (consigneeId) formData.set("consignee_id", consigneeId);
        if (actualWeight) formData.set("actual_weight_lb", actualWeight);
        if (lengthIn) formData.set("length_in", lengthIn);
        if (widthIn) formData.set("width_in", widthIn);
        if (heightIn) formData.set("height_in", heightIn);
        formData.set("pieces_count", piecesCount);
        formData.set("is_damaged", String(isDamaged));
        if (isDamaged) formData.set("damage_description", damageDescription);
        formData.set("is_dgr", String(isDgr));
        if (notes) formData.set("notes", notes);
        if (senderName) formData.set("sender_name", senderName);
        if (warehouseLocationId) formData.set("warehouse_location_id", warehouseLocationId);
        formData.set("photos", JSON.stringify(photos.map((p) => ({
          storage_path: p.storagePath,
          file_name: p.fileName,
          is_damage_photo: p.isDamagePhoto,
        }))));

        const result = await createWarehouseReceipt(formData);
        setCreatedWr(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear recibo");
      }
    });
  }, [
    warehouseId, agencyId, trackingNumber, carrier, consigneeId,
    actualWeight, lengthIn, widthIn, heightIn, piecesCount,
    isDamaged, damageDescription, isDgr, notes, senderName,
    warehouseLocationId, photos,
  ]);

  // Success state — show summary + actions
  if (createdWr) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <div className="text-2xl">✓</div>
          <h3 className="mt-2 text-lg font-semibold text-green-800">Recibo creado</h3>
          <p className="mt-1 font-mono text-sm text-green-700">{createdWr.wr_number}</p>
          <p className="text-sm text-green-600">
            {trackingNumber} • {isUnknownAgency ? "Desconocido" : selectedAgency?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Imprimir Etiqueta
          </button>
          <button
            type="button"
            onClick={resetForAnother}
            className="flex-1 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Registrar Otra Caja
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/inventory/${createdWr.id}`)}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Ver detalle del recibo
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Progress bar */}
      <div className="flex gap-1">
        {activeSteps.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= stepIndex ? "bg-gray-900" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <div className="text-xs font-medium text-gray-500">
        Paso {stepIndex + 1} de {activeSteps.length}: {STEP_LABELS[step]}
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          {duplicateInfo && (
            <button
              type="button"
              onClick={() => router.push(`/${locale}/warehouse-receipts`)}
              className="ml-2 underline"
            >
              Ver recibo existente
            </button>
          )}
        </div>
      )}

      {/* Step content */}
      <div className="rounded-lg border bg-white p-4">
        {/* STEP: Agency */}
        {step === "agency" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Seleccionar bodega
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              disabled={warehouses.length <= 1}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium text-gray-700">
              Seleccionar agencia
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {agencies.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setAgencyId(a.id);
                    setConsigneeId("");
                    setConsigneeSearch("");
                  }}
                  className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                    agencyId === a.id
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {a.code}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setAgencyId("unknown");
                  setConsigneeId("");
                  setConsigneeSearch("");
                }}
                className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                  agencyId === "unknown"
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-amber-200 text-amber-700 hover:bg-amber-50"
                }`}
              >
                Desconocido
              </button>
            </div>
            {selectedAgency && (
              <p className="text-sm text-gray-500">{selectedAgency.name}</p>
            )}
            {agencyId === "unknown" && (
              <p className="text-sm text-amber-600">
                El paquete se registrará como WR desconocido. Las agencias podrán reclamarlo después.
              </p>
            )}
          </div>
        )}

        {/* STEP: Tracking */}
        {step === "tracking" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Número de guía / Tracking
            </label>
            <input
              ref={trackingRef}
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleTrackingNext();
                }
              }}
              placeholder="Escanee o escriba el tracking..."
              autoFocus
              className="w-full rounded-md border border-gray-300 px-3 py-3 text-lg font-mono focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
            />
            <p className="text-xs text-gray-400">
              Escanee con lector de códigos o escriba manualmente. Presione Enter para continuar.
            </p>
          </div>
        )}

        {/* STEP: Carrier */}
        {step === "carrier" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Transportista
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CARRIERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCarrier(c)}
                  className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                    carrier === c
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Weight & Dimensions */}
        {step === "weight" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Peso real (lb)
              </label>
              <input
                type="number"
                step="0.01"
                value={actualWeight}
                onChange={(e) => setActualWeight(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Largo (in)</label>
                <input
                  type="number"
                  step="0.1"
                  value={lengthIn}
                  onChange={(e) => setLengthIn(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Ancho (in)</label>
                <input
                  type="number"
                  step="0.1"
                  value={widthIn}
                  onChange={(e) => setWidthIn(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Alto (in)</label>
                <input
                  type="number"
                  step="0.1"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Weight summary */}
            <div className="rounded-md bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Peso real</span>
                <span className="font-mono">{actualWeight || "—"} lb</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Peso volumétrico</span>
                <span className="font-mono">
                  {volumetricWeight ? volumetricWeight.toFixed(2) : "—"} lb
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t pt-1 font-medium">
                <span>Peso facturable</span>
                <span className="font-mono">{billableWeight.toFixed(2)} lb</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Photos */}
        {step === "photos" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Fotos del paquete
            </label>
            <PhotoUpload
              bucket="wr-photos"
              folder={`${warehouseId}/${Date.now()}`}
              minPhotos={isDamaged ? 3 : 1}
              maxPhotos={10}
              isDamageMode={isDamaged}
              onPhotosChange={setPhotos}
            />
          </div>
        )}

        {/* STEP: Consignee */}
        {step === "consignee" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Destinatario
            </label>
            <input
              type="text"
              value={consigneeSearch}
              onChange={(e) => setConsigneeSearch(e.target.value)}
              placeholder="Buscar destinatario por nombre..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
            />

            {consignees.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {consignees.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setConsigneeId(c.id);
                      setConsigneeSearch(c.full_name);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      consigneeId === c.id ? "bg-gray-100" : ""
                    }`}
                  >
                    <span className="font-medium">{c.full_name}</span>
                    <span className="text-xs text-gray-400">
                      {c.cedula_ruc ?? c.city ?? ""}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {consigneeSearch.length >= 2 && consignees.length === 0 && !showQuickCreate && (
              <div className="text-xs text-gray-400">
                <p>No se encontró destinatario.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCreate(true);
                    setNewConsigneeName(consigneeSearch);
                  }}
                  className="mt-1 text-gray-900 underline"
                >
                  Crear destinatario nuevo
                </button>
              </div>
            )}

            {showQuickCreate && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
                <p className="text-xs font-medium text-blue-700">Crear destinatario rápido</p>
                <input
                  type="text"
                  value={newConsigneeName}
                  onChange={(e) => setNewConsigneeName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleQuickCreate}
                    disabled={creatingConsignee || !newConsigneeName.trim()}
                    className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {creatingConsignee ? "Creando..." : "Crear"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickCreate(false)}
                    className="rounded border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {selectedConsignee && (
              <div className="rounded-md bg-gray-50 p-2 text-sm">
                Seleccionado: <span className="font-medium">{selectedConsignee.full_name}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP: Details */}
        {step === "details" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Piezas</label>
              <input
                type="number"
                min="1"
                value={piecesCount}
                onChange={(e) => setPiecesCount(e.target.value)}
                className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
              />
            </div>

            {warehouseLocations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ubicación en bodega
                </label>
                <select
                  value={warehouseLocationId}
                  onChange={(e) => setWarehouseLocationId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                >
                  <option value="">Sin asignar</option>
                  {warehouseLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.zone_name ? `${loc.zone_name} — ` : ""}{loc.location_code}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre del remitente
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Opcional"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isDamaged}
                  onChange={(e) => setIsDamaged(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Paquete dañado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isDgr}
                  onChange={(e) => setIsDgr(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Mercancía peligrosa (DGR)
              </label>
            </div>

            {isDamaged && (
              <div>
                <label className="block text-sm font-medium text-red-700">
                  Descripción del daño (requerido)
                </label>
                <textarea
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones adicionales..."
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STEP: Confirm */}
        {step === "confirm" && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Resumen del recibo</h3>
            <div className="divide-y rounded-md border text-sm">
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-500">Agencia</span>
                <span className={`font-medium ${isUnknownAgency ? "text-amber-600" : ""}`}>
                  {isUnknownAgency ? "Desconocido" : selectedAgency?.name}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-500">Guía</span>
                <span className="font-mono">{trackingNumber}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-500">Transportista</span>
                <span>{carrier}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-500">Peso facturable</span>
                <span className="font-mono">{billableWeight.toFixed(2)} lb</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-500">Destinatario</span>
                <span>{selectedConsignee?.full_name ?? "—"}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-500">Piezas</span>
                <span>{piecesCount}</span>
              </div>
              {isDamaged && (
                <div className="flex justify-between px-3 py-2 text-red-700">
                  <span>Dañado</span>
                  <span>Sí</span>
                </div>
              )}
              {isDgr && (
                <div className="flex justify-between px-3 py-2 text-orange-700">
                  <span>DGR</span>
                  <span>Sí</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-2">
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Atrás
          </button>
        )}

        <div className="flex-1" />

        {step === "tracking" ? (
          <button
            type="button"
            onClick={handleTrackingNext}
            className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Verificar y continuar
          </button>
        ) : step === "confirm" ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Confirmar Recibo"}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={
              (step === "agency" && !agencyId) ||
              (step === "carrier" && !carrier)
            }
            className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Siguiente
          </button>
        )}
      </div>
    </div>
  );
}
