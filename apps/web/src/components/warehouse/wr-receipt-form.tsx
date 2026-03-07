"use client";

import { detectCarrier } from "@no-wms/shared/constants/carrier-detection";
import { CARRIERS } from "@no-wms/shared/constants/carriers";
import type { ConditionFlag } from "@no-wms/shared/constants/condition-flags";
import {
  CONDITION_FLAG_COLORS,
  CONDITION_FLAG_LABELS_ES,
  CONDITION_FLAGS,
} from "@no-wms/shared/constants/condition-flags";
import { PACKAGE_TYPES } from "@no-wms/shared/constants/package-types";
import {
  calculateBillableWeight,
  calculateVolumetricWeight,
} from "@no-wms/shared/validators/warehouse-receipt";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CircleCheck,
  FileText,
  Package,
  ScanBarcode,
  Truck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Combobox } from "@/components/ui/combobox";
import type { UploadedFile } from "@/components/ui/file-upload";
import { FileUpload } from "@/components/ui/file-upload";
import { FormCard, FormSection } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import type { UploadedPhoto } from "@/components/ui/photo-upload";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { useNotification } from "@/components/layout/notification";
import { checkCasilleroUnique, generateCasillero, quickCreateConsignee, searchConsignees } from "@/lib/actions/consignees";
import { createClient } from "@/lib/supabase/client";
import {
  checkDuplicateTracking,
  checkWrNumberUnique,
  createWarehouseReceipt,
  generateWrNumberForWarehouse,
} from "@/lib/actions/warehouse-receipts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Agency {
  id: string;
  name: string;
  code: string;
  allow_multi_package: boolean;
  organization_id: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  organization_id: string;
  organization_name: string | null;
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
  agency_id: string;
  agencies: { code: string } | { code: string }[] | null;
}

interface PackageData {
  tracking_number: string;
  actual_weight_lb: string;
  length_in: string;
  width_in: string;
  height_in: string;
  content_description: string;
  pkg_notes: string;
  is_dgr: boolean;
  dgr_class: string;
  is_damaged: boolean;
  damage_description: string;
  pieces_count: string;
  package_type: string;
  condition_flags: string[];
  photos: UploadedPhoto[];
}

interface WrReceiptFormProps {
  agencies: Agency[];
  warehouses: Warehouse[];
  warehouseLocations?: WarehouseLocation[];
  isSuperAdmin?: boolean;
  locale: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyPackage(tracking = ""): PackageData {
  return {
    tracking_number: tracking,
    actual_weight_lb: "",
    length_in: "",
    width_in: "",
    height_in: "",
    content_description: "",
    pkg_notes: "",
    is_dgr: false,
    dgr_class: "",
    is_damaged: false,
    damage_description: "",
    pieces_count: "1",
    package_type: "Box",
    condition_flags: ["sin_novedad"],
    photos: [],
  };
}

function consigneeAgencyCode(c: Consignee): string {
  if (!c.agencies) return "";
  const a = Array.isArray(c.agencies) ? c.agencies[0] : c.agencies;
  return a?.code ?? "";
}

const inputCls =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors";

const textareaCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function warehouseLabel(w: Warehouse, showOrg: boolean): string {
  const base = `${w.name} (${w.code})`;
  return showOrg && w.organization_name ? `${base} — ${w.organization_name}` : base;
}

export function WrReceiptForm({
  agencies,
  warehouses,
  warehouseLocations = [],
  isSuperAdmin = false,
  locale,
}: WrReceiptFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  // Phase: scan → form → success
  const [phase, setPhase] = useState<"scan" | "form" | "success">("scan");

  // WR-level state
  const [wrNumber, setWrNumber] = useState("");
  const [isGeneratingWrNumber, setIsGeneratingWrNumber] = useState(false);
  const [wrNumberError, setWrNumberError] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [agencyId, setAgencyId] = useState("");
  const [shipperName, setShipperName] = useState("");
  const [consigneeId, setConsigneeId] = useState("");
  const [consigneeSearch, setConsigneeSearch] = useState("");
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [consigneeHighlight, setConsigneeHighlight] = useState(-1);
  const [carrier, setCarrier] = useState("");
  const [masterTracking, setMasterTracking] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [warehouseLocationId, setWarehouseLocationId] = useState("");

  // Package state
  const [packages, setPackages] = useState<PackageData[]>([emptyPackage()]);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [createdWr, setCreatedWr] = useState<{ id: string; wr_number: string } | null>(null);
  const [creatingConsignee, setCreatingConsignee] = useState(false);
  const [quickCreateModal, setQuickCreateModal] = useState(false);
  const [quickCreateAgencyId, setQuickCreateAgencyId] = useState("");
  const [quickCreateCasillero, setQuickCreateCasillero] = useState("");
  const [casilleroLoading, setCasilleroLoading] = useState(false);
  const [casilleroError, setCasilleroError] = useState("");
  const [duplicateInfo, setDuplicateInfo] = useState<{
    wr_number: string;
    received_at: string;
  } | null>(null);

  // Scanning state (for loading indicator on scan gate)
  const [isScanning, setIsScanning] = useState(false);

  // Refs
  const scanInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  const consigneeListRef = useRef<HTMLDivElement>(null);

  // Computed — filter agencies by selected warehouse's organization
  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === warehouseId),
    [warehouses, warehouseId],
  );
  const filteredAgencies = useMemo(
    () =>
      selectedWarehouse
        ? agencies.filter((a) => a.organization_id === selectedWarehouse.organization_id)
        : agencies,
    [agencies, selectedWarehouse],
  );
  const selectedAgency = useMemo(
    () => filteredAgencies.find((a) => a.id === agencyId),
    [filteredAgencies, agencyId],
  );
  const allowMultiPackage = selectedAgency?.allow_multi_package ?? true;
  const isUnknownAgency = agencyId === "unknown";

  const [selectedConsignee, setSelectedConsignee] = useState<Consignee | null>(null);

  const masterTrackingRef = useRef<HTMLInputElement>(null);
  const masterTrackingMouseDown = useRef(false);
  const savedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Storage cleanup — delete orphaned uploads when form is abandoned
  // ---------------------------------------------------------------------------

  const cleanupUploads = useCallback(() => {
    const photoPaths = packages.flatMap((p) => p.photos.map((ph) => ph.storagePath));
    const attachPaths = attachments.map((a) => a.storagePath);

    if (photoPaths.length === 0 && attachPaths.length === 0) return;

    const supabase = createClient();
    if (photoPaths.length > 0) {
      supabase.storage.from("wr-photos").remove(photoPaths);
    }
    if (attachPaths.length > 0) {
      supabase.storage.from("wr-attachments").remove(attachPaths);
    }
  }, [packages, attachments]);

  // Keep cleanup ref current so the unmount effect uses latest state
  const cleanupRef = useRef(cleanupUploads);
  cleanupRef.current = cleanupUploads;

  // Cleanup on unmount if WR was never saved
  useEffect(() => {
    return () => {
      if (!savedRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Package helpers
  // ---------------------------------------------------------------------------

  const updatePackage = useCallback(
    (index: number, field: keyof PackageData, value: string | boolean | string[] | UploadedPhoto[]) => {
      setPackages((prev) =>
        prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
      );
    },
    [],
  );

  const addPackage = useCallback(() => {
    setPackages((prev) => [...prev, emptyPackage()]);
  }, []);

  const removePackage = useCallback(
    (index: number) => {
      if (packages.length <= 1) return;
      setPackages((prev) => prev.filter((_, i) => i !== index));
    },
    [packages.length],
  );

  // Trim to single package when agency disallows multi-package
  useEffect(() => {
    if (!allowMultiPackage && packages.length > 1) {
      setPackages((prev) => [prev[0]!]);
    }
  }, [allowMultiPackage, packages.length]);

  // ---------------------------------------------------------------------------
  // Consignee search (debounced)
  // ---------------------------------------------------------------------------

  const filteredAgencyIds = useMemo(
    () => new Set(filteredAgencies.map((a) => a.id)),
    [filteredAgencies],
  );

  useEffect(() => {
    if (consigneeSearch.length < 2) {
      setConsignees([]);
      return;
    }

    // Search within agency if selected, otherwise search globally
    const searchAgency = agencyId && agencyId !== "unknown" ? agencyId : null;

    const timeout = setTimeout(async () => {
      const result = await searchConsignees(searchAgency, consigneeSearch);
      if (result.data) {
        // Filter results to only consignees from agencies in the selected warehouse's org
        const filtered = searchAgency
          ? result.data
          : result.data.filter((c) => filteredAgencyIds.has(c.agency_id));
        setConsignees(filtered);
        setConsigneeHighlight(filtered.length > 0 ? 0 : -1);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [agencyId, consigneeSearch, filteredAgencyIds]);

  // Scroll highlighted consignee into view
  useEffect(() => {
    if (consigneeHighlight >= 0 && consigneeListRef.current) {
      const item = consigneeListRef.current.children[consigneeHighlight] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [consigneeHighlight]);

  // ---------------------------------------------------------------------------
  // Select consignee (with auto-agency inference)
  // ---------------------------------------------------------------------------

  const selectConsignee = useCallback(
    (c: Consignee) => {
      setConsigneeId(c.id);
      setSelectedConsignee(c);
      setConsigneeSearch("");
      setConsignees([]);
      setConsigneeHighlight(-1);
      // Auto-infer agency if none selected (only if agency belongs to current warehouse's org)
      if (!agencyId && c.agency_id && filteredAgencyIds.has(c.agency_id)) {
        setAgencyId(c.agency_id);
      }
    },
    [agencyId, filteredAgencyIds],
  );

  // ---------------------------------------------------------------------------
  // WR number uniqueness check (debounced)
  // ---------------------------------------------------------------------------

  // Generate WR number when warehouse changes
  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    setIsGeneratingWrNumber(true);
    generateWrNumberForWarehouse(warehouseId)
      .then((num) => {
        if (!cancelled) setWrNumber(num);
      })
      .catch(() => {
        // Ignore — user can still type manually
      })
      .finally(() => {
        if (!cancelled) setIsGeneratingWrNumber(false);
      });
    return () => { cancelled = true; };
  }, [warehouseId]);

  // Reset agency & consignee when warehouse changes (agency may belong to different org)
  useEffect(() => {
    if (agencyId && agencyId !== "unknown") {
      const stillValid = filteredAgencies.some((a) => a.id === agencyId);
      if (!stillValid) {
        setAgencyId("");
        setConsigneeId("");
        setSelectedConsignee(null);
        setConsigneeSearch("");
        setConsignees([]);
      }
    }
  }, [filteredAgencies]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!wrNumber.trim()) {
      setWrNumberError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      const isUnique = await checkWrNumberUnique(wrNumber.trim(), warehouseId || undefined);
      setWrNumberError(isUnique ? null : "Este número ya existe");
    }, 500);

    return () => clearTimeout(timeout);
  }, [wrNumber, warehouseId]);

  // ---------------------------------------------------------------------------
  // Scan gate handler
  // ---------------------------------------------------------------------------

  const handleScan = useCallback(async () => {
    const tracking = packages[0]?.tracking_number.trim() ?? "";
    if (!tracking) {
      setError("Ingrese el número de guía");
      return;
    }

    setError(null);
    setIsScanning(true);

    try {
      const duplicate = await checkDuplicateTracking(tracking);

      if (duplicate) {
        setDuplicateInfo(duplicate);
        setError(
          `Esta guía ya fue recibida el ${new Date(duplicate.received_at).toLocaleDateString("es")}.`,
        );
        return;
      }

      // Auto-detect carrier and apply intelligent defaults
      const detected = detectCarrier(tracking);
      if (detected) {
        setCarrier(detected);
        if (detected === "Amazon") {
          setShipperName("Amazon");
          // Amazon almost always ships in boxes
          setPackages((prev) =>
            prev.map((p, i) => (i === 0 ? { ...p, package_type: "Box" } : p)),
          );
        }
      }

      // Pre-fill master tracking with first package tracking
      setMasterTracking(tracking);

      setDuplicateInfo(null);
      setPhase("form");

      // Scroll to top of form
      requestAnimationFrame(() => {
        formTopRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } finally {
      setIsScanning(false);
    }
  }, [packages]);

  // Focus scan input on mount
  useEffect(() => {
    if (phase === "scan") {
      scanInputRef.current?.focus();
    }
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Quick-create consignee — casillero auto-generation on agency select
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!quickCreateModal || !quickCreateAgencyId) return;
    let cancelled = false;
    setCasilleroLoading(true);
    setCasilleroError("");
    generateCasillero(quickCreateAgencyId).then((casillero) => {
      if (!cancelled) {
        setQuickCreateCasillero(casillero);
        setCasilleroLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setCasilleroLoading(false);
    });
    return () => { cancelled = true; };
  }, [quickCreateModal, quickCreateAgencyId]);

  // Debounced casillero uniqueness check
  useEffect(() => {
    if (!quickCreateAgencyId || !quickCreateCasillero) {
      setCasilleroError("");
      return;
    }
    if (!/^[A-Z0-9]{2,5}\d{6}$/.test(quickCreateCasillero)) {
      setCasilleroError("Formato inválido (ej: AND000001)");
      return;
    }
    setCasilleroError("");
    const timer = setTimeout(async () => {
      const { unique } = await checkCasilleroUnique(quickCreateAgencyId, quickCreateCasillero);
      if (!unique) {
        setCasilleroError("Casillero ya existe para esta agencia");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [quickCreateAgencyId, quickCreateCasillero]);

  // ---------------------------------------------------------------------------
  // Quick-create consignee
  // ---------------------------------------------------------------------------

  const handleQuickCreate = useCallback(() => {
    if (!consigneeSearch.trim()) return;
    // Always open modal — pre-fill agency if one is already selected
    setQuickCreateAgencyId(agencyId && agencyId !== "unknown" ? agencyId : "");
    setQuickCreateCasillero("");
    setCasilleroError("");
    setQuickCreateModal(true);
  }, [agencyId, consigneeSearch]);

  const doQuickCreate = useCallback(async (targetAgencyId: string, casillero?: string) => {
    if (!consigneeSearch.trim() || !targetAgencyId) return;
    setCreatingConsignee(true);
    const fd = new FormData();
    fd.set("agency_id", targetAgencyId);
    fd.set("full_name", consigneeSearch.trim());
    if (casillero) fd.set("casillero", casillero);
    const result = await quickCreateConsignee(fd);
    if (result.data) {
      const agency = filteredAgencies.find((a) => a.id === targetAgencyId);
      const newConsignee: Consignee = {
        id: result.data.id,
        full_name: result.data.full_name,
        casillero: result.data.casillero,
        cedula_ruc: null,
        city: null,
        agency_id: targetAgencyId,
        agencies: { code: agency?.code ?? "" },
      };
      setConsigneeId(newConsignee.id);
      setSelectedConsignee(newConsignee);
      setConsigneeSearch("");
      setConsignees([]);
      // Also set the agency on the WR form if it wasn't set
      if (!agencyId || agencyId === "unknown") {
        setAgencyId(targetAgencyId);
      }
      setQuickCreateModal(false);
    } else {
      notify(result.error ?? "Error al crear destinatario", "error");
    }
    setCreatingConsignee(false);
  }, [agencyId, consigneeSearch, filteredAgencies, notify]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(() => {
    // Validate required fields
    if (!carrier) {
      notify("Seleccione un transportista", "error");
      return;
    }
    if (!agencyId) {
      notify("Seleccione una agencia destino", "error");
      return;
    }

    // Validate all packages have tracking
    for (let i = 0; i < packages.length; i++) {
      if (!packages[i]!.tracking_number.trim()) {
        notify(`Paquete ${i + 1}: falta el número de guía`, "error");
        return;
      }
    }

    // Validate photo count
    const anyDamaged = packages.some((p) => p.is_damaged);
    const totalPhotos = packages.reduce((sum, p) => sum + p.photos.length, 0);
    const minRequired = anyDamaged ? 3 : 1;
    if (totalPhotos < minRequired) {
      notify(
        anyDamaged
          ? "Se requieren mínimo 3 fotos cuando hay daño"
          : "Agregue al menos 1 foto del paquete",
        "error",
      );
      return;
    }

    if (wrNumberError) {
      notify("El número de recibo ya existe — elija otro", "error");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("warehouse_id", warehouseId);
        if (agencyId !== "unknown") {
          formData.set("agency_id", agencyId);
        }
        if (consigneeId) {
          formData.set("consignee_id", consigneeId);
        } else if (consigneeSearch.trim()) {
          formData.set("consignee_name", consigneeSearch.trim());
        }
        if (notes) formData.set("notes", notes);
        if (warehouseLocationId) formData.set("warehouse_location_id", warehouseLocationId);
        if (shipperName.trim()) formData.set("shipper_name", shipperName.trim());
        if (masterTracking.trim()) formData.set("master_tracking", masterTracking.trim());
        if (description.trim()) formData.set("description", description.trim());
        if (wrNumber.trim()) {
          formData.set("wr_number", wrNumber.trim());
        }
        // Aggregate condition flags from all packages for receipt level
        const allFlags = [...new Set(packages.flatMap((p) => p.condition_flags))];
        if (allFlags.length) {
          formData.set("condition_flags", JSON.stringify(allFlags));
        }

        formData.set(
          "packages",
          JSON.stringify(
            packages.map((p) => ({
              tracking_number: p.tracking_number.trim(),
              carrier,
              actual_weight_lb: p.actual_weight_lb || null,
              length_in: p.length_in || null,
              width_in: p.width_in || null,
              height_in: p.height_in || null,
              content_description: p.content_description || null,
              is_dgr: p.is_dgr,
              dgr_class: p.dgr_class || null,
              is_damaged: p.is_damaged,
              damage_description: p.is_damaged ? p.damage_description : null,
              sender_name: null,
              pieces_count: parseInt(p.pieces_count, 10) || 1,
              package_type: p.package_type || null,
              notes: p.pkg_notes || null,
              condition_flags: p.condition_flags,
            })),
          ),
        );

        // Collect all photos from all packages (with package index for linking)
        const allPhotos = packages.flatMap((p, pkgIdx) =>
          p.photos.map((photo) => ({
            storage_path: photo.storagePath,
            file_name: photo.fileName,
            is_damage_photo: photo.isDamagePhoto,
            package_index: pkgIdx,
          })),
        );
        formData.set("photos", JSON.stringify(allPhotos));

        // Attachments
        if (attachments.length) {
          formData.set(
            "attachments",
            JSON.stringify(
              attachments.map((a) => ({
                storage_path: a.storagePath,
                file_name: a.fileName,
              })),
            ),
          );
        }

        const result = await createWarehouseReceipt(formData);
        savedRef.current = true;
        setCreatedWr(result);
        setPhase("success");
      } catch (err) {
        notify(err instanceof Error ? err.message : "Error al crear recibo", "error");
      }
    });
  }, [
    warehouseId, agencyId, consigneeId, consigneeSearch, notes, warehouseLocationId,
    shipperName, masterTracking, description, wrNumber,
    carrier, packages, attachments, wrNumberError, notify,
  ]);

  // ---------------------------------------------------------------------------
  // Reset for another
  // ---------------------------------------------------------------------------

  // Reset form — keep warehouse, agency, and carrier (they repeat between receipts)
  const resetForAnother = useCallback(() => {
    savedRef.current = false;
    setPackages([emptyPackage()]);
    setConsigneeId("");
    setSelectedConsignee(null);
    setConsigneeSearch("");
    setConsignees([]);
    setShipperName("");
    setMasterTracking("");
    setDescription("");
    setNotes("");
    setAttachments([]);
    setWarehouseLocationId("");
    setDuplicateInfo(null);
    setCreatedWr(null);
    setError(null);
    setPhase("scan");
    // Re-fetch WR number for current warehouse
    if (warehouseId) {
      setIsGeneratingWrNumber(true);
      generateWrNumberForWarehouse(warehouseId)
        .then((num) => setWrNumber(num))
        .catch(() => {})
        .finally(() => setIsGeneratingWrNumber(false));
    }
  }, [warehouseId]);

  // =========================================================================
  // RENDER: Success
  // =========================================================================

  if (phase === "success" && createdWr) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Package className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-800">Recibo creado</h3>
          <p className="mt-1 font-mono text-sm text-green-700">{createdWr.wr_number}</p>
          <p className="mt-1 text-sm text-green-600">
            {packages[0]?.tracking_number ?? ""}
            {packages.length > 1 ? ` (+${packages.length - 1} más)` : ""} •{" "}
            {isUnknownAgency ? "Desconocido" : selectedAgency?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Imprimir Etiqueta
          </button>
          <button
            type="button"
            onClick={resetForAnother}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Registrar Otra Caja
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/warehouse-receipts/${createdWr.id}`)}
          className="w-full text-center text-sm text-gray-500 underline hover:text-gray-700"
        >
          Ver detalle del recibo
        </button>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Scan Gate
  // =========================================================================

  if (phase === "scan") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <ScanBarcode className="h-6 w-6 text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Escanear Paquete</h2>
            <p className="mt-1 text-sm text-gray-500">
              Escanee con lector de códigos o escriba el número de guía
            </p>
          </div>

          <input
            ref={scanInputRef}
            type="text"
            value={packages[0]?.tracking_number ?? ""}
            onChange={(e) => updatePackage(0, "tracking_number", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleScan();
              }
            }}
            placeholder="Número de guía / Tracking"
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-4 py-4 text-center font-mono text-lg tracking-wider text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-colors"
          />

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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

          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning}
            className="mt-4 w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isScanning ? "Verificando..." : "Continuar"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            Presione Enter para continuar
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Receipt Form
  // =========================================================================

  return (
    <div ref={formTopRef} className="mx-auto max-w-2xl space-y-4">
      {/* ----------------------------------------------------------------- */}
      {/* WR Header + Shipment + Details Card                               */}
      {/* ----------------------------------------------------------------- */}
      <FormCard>
        {/* WR Number + Warehouse */}
        <FormSection title="Recibo de Almacén" icon={Building2}>
          {warehouses.length > 1 && (
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">Bodega</label>
              <Combobox
                options={warehouses.map((w) => ({
                  value: w.id,
                  label: warehouseLabel(w, isSuperAdmin),
                }))}
                value={warehouseId}
                onChange={setWarehouseId}
                placeholder="Buscar bodega..."
              />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">
                Número de recibo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={wrNumber}
                  onChange={(e) => setWrNumber(e.target.value.toUpperCase())}
                  disabled={isGeneratingWrNumber}
                  className={`${inputCls} font-mono ${wrNumberError ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""} ${isGeneratingWrNumber ? "opacity-50" : ""}`}
                />
                {isGeneratingWrNumber && (
                  <p className="mt-1 text-xs text-gray-400">Generando...</p>
                )}
                {wrNumberError && (
                  <p className="mt-1 text-xs text-red-500">{wrNumberError}</p>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">Master Tracking</label>
              <input
                ref={masterTrackingRef}
                type="text"
                value={masterTracking}
                onChange={(e) => setMasterTracking(e.target.value)}
                onMouseDown={() => {
                  if (document.activeElement !== masterTrackingRef.current) {
                    masterTrackingMouseDown.current = true;
                  }
                }}
                onMouseUp={(e) => {
                  if (masterTrackingMouseDown.current) {
                    masterTrackingMouseDown.current = false;
                    e.preventDefault();
                    e.currentTarget.select();
                  }
                }}
                onFocus={(e) => e.target.select()}
                placeholder="AWB / Master tracking"
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>
        </FormSection>

        {/* Shipment Info */}
        <FormSection title="Envío" icon={Truck} description="Transportista, destinatario y agencia">
          {/* Carrier */}
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">
              Transportista <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CARRIERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCarrier(c)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
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

          {/* Shipper */}
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">
              Shipper / Remitente
            </label>
            <input
              type="text"
              value={shipperName}
              onChange={(e) => setShipperName(e.target.value)}
              placeholder="Nombre del remitente"
              className={inputCls}
            />
          </div>

          {/* Consignee */}
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">Destinatario</label>

            {/* Show selected chip OR search input */}
            {selectedConsignee ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">{selectedConsignee.full_name}</span>
                  <span className="font-mono text-xs text-gray-400">
                    {selectedConsignee.casillero}
                  </span>
                  {consigneeAgencyCode(selectedConsignee) && (
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                      {consigneeAgencyCode(selectedConsignee)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConsigneeId("");
                    setSelectedConsignee(null);
                    setConsigneeSearch("");
                    setConsignees([]);
                  }}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={consigneeSearch}
                  onChange={(e) => {
                    setConsigneeSearch(e.target.value);
                    setConsigneeHighlight(0);
                  }}
                  onKeyDown={(e) => {
                    const canCreate = consigneeSearch.trim().length >= 2 && !isUnknownAgency;
                    const totalItems = consignees.length + (canCreate ? 1 : 0);
                    if (!totalItems) return;
                    switch (e.key) {
                      case "ArrowDown":
                        e.preventDefault();
                        setConsigneeHighlight((i) =>
                          i < totalItems - 1 ? i + 1 : 0,
                        );
                        break;
                      case "ArrowUp":
                        e.preventDefault();
                        setConsigneeHighlight((i) =>
                          i > 0 ? i - 1 : totalItems - 1,
                        );
                        break;
                      case "Enter":
                        e.preventDefault();
                        if (consigneeHighlight >= 0 && consigneeHighlight < consignees.length && consignees[consigneeHighlight]) {
                          selectConsignee(consignees[consigneeHighlight]!);
                        } else if (canCreate && consigneeHighlight === consignees.length) {
                          handleQuickCreate();
                        }
                        break;
                      case "Escape":
                        e.preventDefault();
                        setConsignees([]);
                        setConsigneeHighlight(-1);
                        break;
                    }
                  }}
                  placeholder="Buscar por nombre o casillero..."
                  autoComplete="nope"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={consignees.length > 0 || consigneeSearch.length >= 2}
                  className={inputCls}
                />

                {(() => {
                  const canCreate = consigneeSearch.trim().length >= 2 && !isUnknownAgency;
                  const showDropdown = consignees.length > 0 || canCreate;
                  if (!showDropdown) return null;
                  const createIndex = consignees.length;
                  return (
                    <div
                      ref={consigneeListRef}
                      className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                    >
                      {consignees.map((c, i) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectConsignee(c)}
                          onMouseEnter={() => setConsigneeHighlight(i)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                            i === consigneeHighlight
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{c.full_name}</span>
                            <span className="font-mono text-xs text-gray-400">
                              {c.casillero}
                            </span>
                            {!agencyId && consigneeAgencyCode(c) && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                {consigneeAgencyCode(c)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {c.cedula_ruc ?? c.city ?? ""}
                          </span>
                        </button>
                      ))}
                      {canCreate && (
                        <>
                          {consignees.length > 0 && (
                            <div className="border-t border-gray-100" />
                          )}
                          <button
                            type="button"
                            onClick={handleQuickCreate}
                            onMouseEnter={() => setConsigneeHighlight(createIndex)}
                            disabled={creatingConsignee}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                              consigneeHighlight === createIndex
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>
                              {creatingConsignee
                                ? "Creando..."
                                : <>Crear <span className="font-medium">&ldquo;{consigneeSearch.trim()}&rdquo;</span></>
                              }
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
              )}
            </div>

          {/* Agency selection */}
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">
              Agencia destino <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredAgencies.map((a) => {
                const selected = agencyId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAgencyId(a.id);
                      // Only clear consignee if it belongs to a different agency
                      if (selectedConsignee && selectedConsignee.agency_id !== a.id) {
                        setConsigneeId("");
                        setSelectedConsignee(null);
                        setConsigneeSearch("");
                      }
                    }}
                    className={`relative flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                      selected
                        ? "border-gray-900 bg-gray-900 ring-1 ring-gray-900/20"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                        selected
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {a.code}
                    </span>
                    <span
                      className={`truncate text-sm ${
                        selected ? "font-medium text-white" : "text-gray-600"
                      }`}
                    >
                      {a.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setAgencyId("unknown");
                  // Clear consignee only if it was matched from a specific agency
                  if (selectedConsignee && selectedConsignee.agency_id) {
                    setConsigneeId("");
                    setSelectedConsignee(null);
                    setConsigneeSearch("");
                  }
                }}
                className={`relative flex items-center gap-2.5 rounded-lg border-2 border-dashed px-3 py-2.5 text-left transition-all ${
                  isUnknownAgency
                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500/20"
                    : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm ${
                    isUnknownAgency
                      ? "bg-amber-500 font-bold text-white"
                      : "bg-amber-100 font-medium text-amber-700"
                  }`}
                >
                  ?
                </span>
                <span
                  className={`text-sm ${
                    isUnknownAgency
                      ? "font-medium text-amber-800"
                      : "text-gray-500"
                  }`}
                >
                  Desconocida
                </span>
              </button>
            </div>
            {isUnknownAgency && (
              <p className="mt-1.5 text-xs text-amber-600">
                Se registrará como WR desconocido. Las agencias podrán reclamarlo después.
              </p>
            )}
          </div>

        </FormSection>

        {/* Description & Notes */}
        <FormSection title="Descripción" icon={FileText}>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">
              Descripción del envío
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descripción general del contenido..."
              className={textareaCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales..."
              className={textareaCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">
              Adjuntos
            </label>
            <FileUpload
              bucket="wr-attachments"
              folder={`${warehouseId}/${Date.now()}`}
              onFilesChange={setAttachments}
            />
          </div>
        </FormSection>

        {/* Warehouse Location (if available) */}
        {warehouseLocations.length > 0 && (
          <FormSection title="Ubicación" icon={Building2}>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">
                Ubicación en bodega
              </label>
              <select
                value={warehouseLocationId}
                onChange={(e) => setWarehouseLocationId(e.target.value)}
                className={inputCls}
              >
                <option value="">Sin asignar</option>
                {warehouseLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.zone_name ? `${loc.zone_name} — ` : ""}
                    {loc.location_code}
                  </option>
                ))}
              </select>
            </div>
          </FormSection>
        )}
      </FormCard>

      {/* ----------------------------------------------------------------- */}
      {/* Package Cards                                                      */}
      {/* ----------------------------------------------------------------- */}
      {packages.map((pkg, pkgIndex) => (
        <PackageCard
          key={pkgIndex}
          pkg={pkg}
          index={pkgIndex}
          total={packages.length}
          warehouseId={warehouseId}
          onUpdate={(field, value) => updatePackage(pkgIndex, field, value)}
          onRemove={packages.length > 1 ? () => removePackage(pkgIndex) : undefined}
        />
      ))}

      {/* Add package button */}
      {allowMultiPackage && (
        <button
          type="button"
          onClick={addPackage}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          + Agregar paquete
        </button>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Actions                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button
          type="button"
          onClick={() => {
            cleanupUploads();
            setPhase("scan");
            setError(null);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !!wrNumberError}
          className="rounded-lg bg-gray-900 px-8 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Guardando..." : "Crear Recibo"}
        </button>
      </div>

      {/* Quick-create consignee modal — when no agency is selected */}
      <Modal open={quickCreateModal} onClose={() => setQuickCreateModal(false)} size="sm">
        <ModalHeader onClose={() => setQuickCreateModal(false)}>
          Crear destinatario
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                value={consigneeSearch}
                disabled
                className={inputCls + " bg-gray-50"}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Agencia <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {filteredAgencies.map((a) => {
                  const selected = quickCreateAgencyId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setQuickCreateAgencyId(a.id)}
                      className={`flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                        selected
                          ? "border-gray-900 bg-gray-900 ring-1 ring-gray-900/20"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                          selected
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {a.code}
                      </span>
                      <span
                        className={`truncate text-sm ${
                          selected ? "font-medium text-white" : "text-gray-600"
                        }`}
                      >
                        {a.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {quickCreateAgencyId && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Casillero</label>
                <div className="relative">
                  <input
                    type="text"
                    value={quickCreateCasillero}
                    onChange={(e) => setQuickCreateCasillero(e.target.value.toUpperCase())}
                    disabled={casilleroLoading}
                    placeholder={casilleroLoading ? "Generando..." : "Ej: AND000001"}
                    className={`${inputCls} font-mono${casilleroError ? " border-red-300 focus:border-red-400 focus:ring-red-400" : ""}`}
                  />
                  {casilleroLoading && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>
                {casilleroError && (
                  <p className="mt-1 text-xs text-red-500">{casilleroError}</p>
                )}
                {!casilleroError && quickCreateCasillero && !casilleroLoading && (
                  <p className="mt-1 text-xs text-gray-400">Puedes modificarlo si es necesario</p>
                )}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setQuickCreateModal(false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => doQuickCreate(quickCreateAgencyId, quickCreateCasillero || undefined)}
            disabled={!quickCreateAgencyId || creatingConsignee || !!casilleroError || casilleroLoading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {creatingConsignee ? "Creando..." : "Crear"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConditionSection sub-component
// ---------------------------------------------------------------------------

const PROBLEM_FLAGS = CONDITION_FLAGS.filter((f) => f !== "sin_novedad");

function ConditionSection({
  pkg,
  onUpdate,
}: {
  pkg: PackageData;
  onUpdate: (field: keyof PackageData, value: string | boolean | string[] | UploadedPhoto[]) => void;
}) {
  const flags = pkg.condition_flags;
  const isClean = flags.includes("sin_novedad");
  const hasProblems = flags.some((f) => f !== "sin_novedad");

  const toggleFlag = (flag: string) => {
    const without = flags.filter((f) => f !== flag && f !== "sin_novedad");
    const next = flags.includes(flag) ? without : [...without, flag];
    if (next.length === 0) {
      onUpdate("condition_flags", ["sin_novedad"]);
      onUpdate("is_damaged", false);
    } else {
      onUpdate("condition_flags", next);
      onUpdate("is_damaged", true);
    }
  };

  const resetToClean = () => {
    onUpdate("condition_flags", ["sin_novedad"]);
    onUpdate("is_damaged", false);
  };

  const openReport = () => {
    // Remove sin_novedad but don't select any flag yet — user picks
    onUpdate("condition_flags", []);
    onUpdate("is_damaged", true);
  };

  // --- Clean state: two pill buttons side by side ---
  if (isClean) {
    return (
      <>
        <div>
          <label className="mb-1.5 block text-sm text-gray-600">Condición de ingreso</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-1.5 rounded-lg border border-green-600 bg-green-600 px-3 py-2 text-sm font-medium text-white"
            >
              <CircleCheck className="h-4 w-4" />
              Sin novedad
            </button>
            <button
              type="button"
              onClick={openReport}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <AlertTriangle className="h-4 w-4" />
              Reportar novedad
            </button>
          </div>
        </div>

        {/* DGR */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={pkg.is_dgr}
            onChange={(e) => onUpdate("is_dgr", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
          />
          Mercancía peligrosa (DGR)
        </label>
        {pkg.is_dgr && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-orange-700">
              Clase DGR
            </label>
            <input
              type="text"
              value={pkg.dgr_class}
              onChange={(e) => onUpdate("dgr_class", e.target.value)}
              placeholder="Ej: Clase 3 - Líquidos inflamables"
              className={inputCls}
            />
          </div>
        )}
      </>
    );
  }

  // --- Problem state: expanded panel ---
  return (
    <>
      <div>
        <label className="mb-1.5 block text-sm text-gray-600">Condición de ingreso</label>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Novedad reportada
          </span>
          <button
            type="button"
            onClick={resetToClean}
            className="text-xs text-green-600 hover:text-green-700"
          >
            Marcar sin novedad
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 px-3 pb-3 sm:grid-cols-5">
          {PROBLEM_FLAGS.map((flag) => {
            const cf = flag as ConditionFlag;
            const active = flags.includes(flag);
            const severe = cf === "caja_mojada" || cf === "contenido_expuesto";
            return (
              <button
                key={flag}
                type="button"
                onClick={() => toggleFlag(flag)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? severe
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-amber-600 bg-amber-600 text-white"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {CONDITION_FLAG_LABELS_ES[cf]}
              </button>
            );
          })}
        </div>
        {hasProblems && (
          <div className="border-t border-amber-200 px-3 py-2.5">
            <label className="mb-1 block text-xs font-medium text-amber-800">
              Descripción del daño <span className="font-normal text-amber-600">(opcional)</span>
            </label>
            <textarea
              value={pkg.damage_description}
              onChange={(e) => onUpdate("damage_description", e.target.value)}
              rows={2}
              placeholder="Describa el daño observado..."
              className="w-full rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 focus:outline-none"
            />
          </div>
          )}
        </div>
      </div>

      {/* DGR */}
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={pkg.is_dgr}
          onChange={(e) => onUpdate("is_dgr", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
        />
        Mercancía peligrosa (DGR)
      </label>
      {pkg.is_dgr && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-orange-700">
            Clase DGR
          </label>
          <input
            type="text"
            value={pkg.dgr_class}
            onChange={(e) => onUpdate("dgr_class", e.target.value)}
            placeholder="Ej: Clase 3 - Líquidos inflamables"
            className={inputCls}
          />
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PackageCard sub-component
// ---------------------------------------------------------------------------

function PackageCard({
  pkg,
  index,
  total,
  warehouseId,
  onUpdate,
  onRemove,
}: {
  pkg: PackageData;
  index: number;
  total: number;
  warehouseId: string;
  onUpdate: (field: keyof PackageData, value: string | boolean | string[] | UploadedPhoto[]) => void;
  onRemove?: () => void;
}) {
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

  const [photoFolder] = useState(
    () => `${warehouseId}/${Date.now()}-pkg${index}`,
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Package header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Paquete {index + 1}
            {total > 1 && (
              <span className="ml-1 text-xs font-normal text-gray-400">
                de {total}
              </span>
            )}
          </h3>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Quitar paquete"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Tracking number */}
        <div>
          <label className="mb-1.5 block text-sm text-gray-600">
            Número de guía <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={pkg.tracking_number}
            onChange={(e) => onUpdate("tracking_number", e.target.value)}
            placeholder="Tracking number"
            className={`${inputCls} font-mono`}
            readOnly={index === 0}
          />
          {index === 0 && (
            <p className="mt-1 text-xs text-gray-400">Escaneado en el paso anterior</p>
          )}
        </div>

        {/* Weight + Dimensions */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Peso (lb)
            </label>
            <input
              type="number"
              step="0.01"
              value={pkg.actual_weight_lb}
              onChange={(e) => onUpdate("actual_weight_lb", e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Largo (in)
            </label>
            <input
              type="number"
              step="0.1"
              value={pkg.length_in}
              onChange={(e) => onUpdate("length_in", e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Ancho (in)
            </label>
            <input
              type="number"
              step="0.1"
              value={pkg.width_in}
              onChange={(e) => onUpdate("width_in", e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Alto (in)
            </label>
            <input
              type="number"
              step="0.1"
              value={pkg.height_in}
              onChange={(e) => onUpdate("height_in", e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </div>
        </div>

        {/* Weight summary */}
        {(pkg.actual_weight_lb || volumetricWeight) && (
          <div className="flex items-center gap-4 rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Vol:</span>
              <span className="font-mono text-gray-700">
                {volumetricWeight ? volumetricWeight.toFixed(2) : "—"} lb
              </span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Facturable:</span>
              <span className="font-mono font-medium text-gray-900">
                {billableWeight.toFixed(2)} lb
              </span>
            </div>
          </div>
        )}

        {/* Type + Pieces */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Tipo de paquete
            </label>
            <select
              value={pkg.package_type}
              onChange={(e) => onUpdate("package_type", e.target.value)}
              className={inputCls}
            >
              {PACKAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Piezas
            </label>
            <input
              type="number"
              min="1"
              value={pkg.pieces_count}
              onChange={(e) => onUpdate("pieces_count", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="mb-1.5 block text-sm text-gray-600">Fotos</label>
          <PhotoUpload
            bucket="wr-photos"
            folder={photoFolder}
            minPhotos={pkg.is_damaged ? 3 : 1}
            maxPhotos={10}
            isDamageMode={pkg.is_damaged}
            onPhotosChange={(photos) => onUpdate("photos", photos)}
          />
        </div>

        {/* Content description */}
        <div>
          <label className="mb-1.5 block text-sm text-gray-600">
            Descripción del contenido
          </label>
          <input
            type="text"
            value={pkg.content_description}
            onChange={(e) => onUpdate("content_description", e.target.value)}
            placeholder="Ej: Electrónicos, ropa, repuestos..."
            className={inputCls}
          />
        </div>

        {/* Package notes */}
        <div>
          <label className="mb-1.5 block text-sm text-gray-600">
            Notas del paquete
          </label>
          <textarea
            value={pkg.pkg_notes}
            onChange={(e) => onUpdate("pkg_notes", e.target.value)}
            rows={2}
            placeholder="Observaciones sobre este paquete..."
            className={textareaCls}
          />
        </div>

        {/* Condition + DGR */}
        <ConditionSection pkg={pkg} onUpdate={onUpdate} />
      </div>
    </div>
  );
}
