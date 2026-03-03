"use client";

import { CARRIERS } from "@no-wms/shared/constants/carriers";
import { PACKAGE_TYPES } from "@no-wms/shared/constants/package-types";
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
  allow_multi_package: boolean;
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
  casillero: string;
  cedula_ruc: string | null;
  city: string | null;
}

interface PackageData {
  tracking_number: string;
  carrier: string;
  actual_weight_lb: string;
  length_in: string;
  width_in: string;
  height_in: string;
  content_description: string;
  is_dgr: boolean;
  dgr_class: string;
  is_damaged: boolean;
  damage_description: string;
  sender_name: string;
  pieces_count: string;
  package_type: string;
}

function emptyPackage(): PackageData {
  return {
    tracking_number: "",
    carrier: "",
    actual_weight_lb: "",
    length_in: "",
    width_in: "",
    height_in: "",
    content_description: "",
    is_dgr: false,
    dgr_class: "",
    is_damaged: false,
    damage_description: "",
    sender_name: "",
    pieces_count: "1",
    package_type: "Box",
  };
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
  const [consigneeId, setConsigneeId] = useState("");
  const [consigneeSearch, setConsigneeSearch] = useState("");
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [notes, setNotes] = useState("");
  const [warehouseLocationId, setWarehouseLocationId] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  // Packages state (1+ packages per WR)
  const [packages, setPackages] = useState<PackageData[]>([emptyPackage()]);
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0);
  const pkg = packages[currentPackageIndex]!;

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

  // Package helpers
  const updatePackage = useCallback(
    (field: keyof PackageData, value: string | boolean) => {
      setPackages((prev) =>
        prev.map((p, i) => (i === currentPackageIndex ? { ...p, [field]: value } : p)),
      );
    },
    [currentPackageIndex],
  );

  const addPackage = useCallback(() => {
    setPackages((prev) => [...prev, emptyPackage()]);
    setCurrentPackageIndex((prev) => prev + 1);
  }, []);

  const removePackage = useCallback(
    (index: number) => {
      if (packages.length <= 1) return;
      setPackages((prev) => prev.filter((_, i) => i !== index));
      setCurrentPackageIndex((prev) => (prev >= index && prev > 0 ? prev - 1 : prev));
    },
    [packages.length],
  );

  // Computed values (derived from current package)
  const volumetricWeight = useMemo(() => {
    const l = parseFloat(pkg.length_in);
    const w = parseFloat(pkg.width_in);
    const h = parseFloat(pkg.height_in);
    if (l > 0 && w > 0 && h > 0) {
      return calculateVolumetricWeight(l, w, h, 166);
    }
    return null;
  }, [pkg.length_in, pkg.width_in, pkg.height_in]);

  const billableWeight = useMemo(() => {
    const actual = parseFloat(pkg.actual_weight_lb) || null;
    return calculateBillableWeight(actual, volumetricWeight);
  }, [pkg.actual_weight_lb, volumetricWeight]);

  const selectedAgency = useMemo(
    () => agencies.find((a) => a.id === agencyId),
    [agencies, agencyId],
  );

  const allowMultiPackage = selectedAgency?.allow_multi_package ?? true;

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

  // Trim to single package when agency disallows multi-package
  useEffect(() => {
    if (!allowMultiPackage && packages.length > 1) {
      setPackages((prev) => [prev[0]!]);
      setCurrentPackageIndex(0);
    }
  }, [allowMultiPackage, packages.length]);

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

  // Validate and advance from tracking step (checks first package's tracking)
  const handleTrackingNext = useCallback(async () => {
    const firstTracking = packages[0]?.tracking_number.trim() ?? "";
    if (!firstTracking) {
      setError("Ingrese el número de guía");
      return;
    }

    // Validate all packages have tracking numbers
    for (let i = 0; i < packages.length; i++) {
      if (!packages[i]!.tracking_number.trim()) {
        setError(`Paquete ${i + 1}: ingrese el número de guía`);
        setCurrentPackageIndex(i);
        return;
      }
    }

    setError(null);
    const duplicate = await checkDuplicateTracking(firstTracking);

    if (duplicate) {
      setDuplicateInfo(duplicate);
      setError(
        `Esta guía ya fue recibida el ${new Date(duplicate.received_at).toLocaleDateString("es")}.`,
      );
      return;
    }

    setDuplicateInfo(null);
    goNext();
  }, [packages, goNext]);

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
      setConsignees((prev) => [...prev, { id: result.data!.id, full_name: result.data!.full_name, casillero: result.data!.casillero, cedula_ruc: null, city: null }]);
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
    setPackages([emptyPackage()]);
    setCurrentPackageIndex(0);
    setConsigneeId("");
    setConsigneeSearch("");
    setConsignees([]);
    setNotes("");
    setWarehouseLocationId("");
    setPhotos([]);
    setDuplicateInfo(null);
    setCreatedWr(null);
    setError(null);
    setStep("tracking");
  }, []);

  // Check if any package is damaged (for photo validation)
  const anyPackageDamaged = packages.some((p) => p.is_damaged);

  // Submit
  const handleSubmit = useCallback(() => {
    // Validate photo count
    const minRequired = anyPackageDamaged ? 3 : 1;
    if (photos.length < minRequired) {
      setError(anyPackageDamaged ? "Se requieren mínimo 3 fotos para paquetes dañados" : "Se requiere al menos 1 foto");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("warehouse_id", warehouseId);
        if (agencyId !== "unknown") {
          formData.set("agency_id", agencyId);
        }
        if (consigneeId) formData.set("consignee_id", consigneeId);
        if (notes) formData.set("notes", notes);
        if (warehouseLocationId) formData.set("warehouse_location_id", warehouseLocationId);
        formData.set("packages", JSON.stringify(packages.map((p) => ({
          tracking_number: p.tracking_number.trim(),
          carrier: p.carrier,
          actual_weight_lb: p.actual_weight_lb || null,
          length_in: p.length_in || null,
          width_in: p.width_in || null,
          height_in: p.height_in || null,
          content_description: p.content_description || null,
          is_dgr: p.is_dgr,
          dgr_class: p.dgr_class || null,
          is_damaged: p.is_damaged,
          damage_description: p.is_damaged ? p.damage_description : null,
          sender_name: p.sender_name || null,
          pieces_count: parseInt(p.pieces_count, 10) || 1,
          package_type: p.package_type || null,
        }))));
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
    warehouseId, agencyId, consigneeId, notes,
    warehouseLocationId, packages, anyPackageDamaged, photos,
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
            {packages[0]?.tracking_number ?? ""}{packages.length > 1 ? ` (+${packages.length - 1} más)` : ""} • {isUnknownAgency ? "Desconocido" : selectedAgency?.name}
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
            {/* Package tabs when multiple packages */}
            {packages.length > 1 && (
              <div className="flex items-center gap-1 border-b pb-2">
                {packages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPackageIndex(i)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      currentPackageIndex === i
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Paquete {i + 1}
                  </button>
                ))}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700">
              {packages.length > 1 ? `Paquete ${currentPackageIndex + 1} — ` : ""}Número de guía / Tracking
            </label>
            <input
              ref={trackingRef}
              type="text"
              value={pkg.tracking_number}
              onChange={(e) => updatePackage("tracking_number", e.target.value)}
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

            {/* Add / Remove package buttons */}
            {allowMultiPackage && (
              <div className="flex items-center gap-2 border-t pt-2">
                <button
                  type="button"
                  onClick={addPackage}
                  className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                >
                  + Agregar paquete
                </button>
                {packages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackage(currentPackageIndex)}
                    className="rounded-md border border-dashed border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:border-red-300 hover:bg-red-50"
                  >
                    Eliminar paquete {currentPackageIndex + 1}
                  </button>
                )}
                {packages.length > 1 && (
                  <span className="ml-auto text-xs text-gray-400">
                    {packages.length} paquete{packages.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP: Carrier */}
        {step === "carrier" && (
          <div className="space-y-3">
            {/* Package tabs when multiple packages */}
            {packages.length > 1 && (
              <div className="flex items-center gap-1 border-b pb-2">
                {packages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPackageIndex(i)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      currentPackageIndex === i
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Paq. {i + 1}
                  </button>
                ))}
              </div>
            )}
            <label className="block text-sm font-medium text-gray-700">
              {packages.length > 1 ? `Paquete ${currentPackageIndex + 1} — ` : ""}Transportista
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CARRIERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updatePackage("carrier", c)}
                  className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                    pkg.carrier === c
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
            {/* Package tabs when multiple packages */}
            {packages.length > 1 && (
              <div className="flex items-center gap-1 border-b pb-2">
                {packages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPackageIndex(i)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      currentPackageIndex === i
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Paq. {i + 1}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {packages.length > 1 ? `Paquete ${currentPackageIndex + 1} — ` : ""}Peso real (lb)
              </label>
              <input
                type="number"
                step="0.01"
                value={pkg.actual_weight_lb}
                onChange={(e) => updatePackage("actual_weight_lb", e.target.value)}
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
                  value={pkg.length_in}
                  onChange={(e) => updatePackage("length_in", e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Ancho (in)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pkg.width_in}
                  onChange={(e) => updatePackage("width_in", e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Alto (in)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pkg.height_in}
                  onChange={(e) => updatePackage("height_in", e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Weight summary */}
            <div className="rounded-md bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Peso real</span>
                <span className="font-mono">{pkg.actual_weight_lb || "—"} lb</span>
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
              minPhotos={anyPackageDamaged ? 3 : 1}
              maxPhotos={10}
              isDamageMode={anyPackageDamaged}
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
              placeholder="Buscar por nombre o casillero..."
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
                    <div>
                      <span className="font-medium">{c.full_name}</span>
                      <span className="ml-2 font-mono text-xs text-gray-400">{c.casillero}</span>
                    </div>
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
                <span className="ml-2 font-mono text-xs text-gray-500">{selectedConsignee.casillero}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP: Details */}
        {step === "details" && (
          <div className="space-y-4">
            {/* Package tabs when multiple packages */}
            {packages.length > 1 && (
              <div className="flex items-center gap-1 border-b pb-2">
                {packages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPackageIndex(i)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      currentPackageIndex === i
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Paq. {i + 1}
                  </button>
                ))}
              </div>
            )}

            {packages.length > 1 && (
              <p className="text-xs font-medium text-gray-500">
                Paquete {currentPackageIndex + 1} de {packages.length}
              </p>
            )}

            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Piezas</label>
                <input
                  type="number"
                  min="1"
                  value={pkg.pieces_count}
                  onChange={(e) => updatePackage("pieces_count", e.target.value)}
                  className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de paquete</label>
                <select
                  value={pkg.package_type}
                  onChange={(e) => updatePackage("package_type", e.target.value)}
                  className="mt-1 w-36 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                >
                  {PACKAGE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
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
                value={pkg.sender_name}
                onChange={(e) => updatePackage("sender_name", e.target.value)}
                placeholder="Opcional"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pkg.is_damaged}
                  onChange={(e) => updatePackage("is_damaged", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Paquete dañado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pkg.is_dgr}
                  onChange={(e) => updatePackage("is_dgr", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Mercancía peligrosa (DGR)
              </label>
            </div>

            {pkg.is_damaged && (
              <div>
                <label className="block text-sm font-medium text-red-700">
                  Descripción del daño (requerido)
                </label>
                <textarea
                  value={pkg.damage_description}
                  onChange={(e) => updatePackage("damage_description", e.target.value)}
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
                <span className="text-gray-500">Destinatario</span>
                <span>{selectedConsignee?.full_name ?? "—"}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-gray-500">Paquetes</span>
                <span>{packages.length}</span>
              </div>
            </div>

            {/* Per-package summary */}
            {packages.map((p, i) => (
              <div key={i} className="divide-y rounded-md border text-sm">
                {packages.length > 1 && (
                  <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                    Paquete {i + 1}
                  </div>
                )}
                <div className="flex justify-between px-3 py-2">
                  <span className="text-gray-500">Guía</span>
                  <span className="font-mono">{p.tracking_number}</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-gray-500">Transportista</span>
                  <span>{p.carrier}</span>
                </div>
                {(p.actual_weight_lb || p.length_in) && (
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-gray-500">Peso</span>
                    <span className="font-mono">{p.actual_weight_lb || "—"} lb</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2">
                  <span className="text-gray-500">Piezas</span>
                  <span>{p.pieces_count}</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-gray-500">Tipo</span>
                  <span>{p.package_type || "—"}</span>
                </div>
                {p.is_damaged && (
                  <div className="flex justify-between px-3 py-2 text-red-700">
                    <span>Dañado</span>
                    <span>Sí</span>
                  </div>
                )}
                {p.is_dgr && (
                  <div className="flex justify-between px-3 py-2 text-orange-700">
                    <span>DGR</span>
                    <span>Sí</span>
                  </div>
                )}
              </div>
            ))}
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
              (step === "carrier" && !pkg.carrier)
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
