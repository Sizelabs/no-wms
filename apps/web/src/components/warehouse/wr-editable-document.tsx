"use client";

import { PACKAGE_TYPES } from "@no-wms/shared/constants/package-types";
import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import JsBarcode from "jsbarcode";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { EditableField } from "@/components/ui/editable-field";
import {
  inputClass as platformInputClass,
  selectClass as platformSelectClass,
  textareaClass as platformTextareaClass,
} from "@/components/ui/form-section";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { ConditionFlagsInlineEdit } from "@/components/warehouse/condition-flags-inline-edit";
import { ConsigneeInlineEdit } from "@/components/warehouse/consignee-inline-edit";
import { searchConsignees } from "@/lib/actions/consignees";
import {
  addPackageToWarehouseReceipt,
  updatePackageField,
  updateWarehouseReceiptField,
} from "@/lib/actions/warehouse-receipts";

interface PrintPackage {
  id: string;
  tracking_number: string;
  carrier: string | null;
  actual_weight_lb: number | null;
  billable_weight_lb: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  pieces_count: number;
  package_type: string | null;
  declared_value_usd: number | null;
}

interface WrEditableDocumentProps {
  wr: {
    id: string;
    wr_number: string;
    status: string;
    received_at: string;
    notes: string | null;
    description: string | null;
    content_description: string | null;
    shipper_name: string | null;
    master_tracking: string | null;
    condition_flags: string[];
    total_actual_weight_lb: number | null;
    total_billable_weight_lb: number | null;
    total_packages: number | null;
    total_declared_value_usd: number | null;
    agency_id: string | null;
    agencies: {
      name: string;
      code: string;
      type: string;
      couriers: { name: string; code: string } | { name: string; code: string }[] | null;
    } | null;
    consignee_name: string | null;
    consignee_id: string | null;
    consignees: { full_name: string; casillero: string | null } | null;
    warehouses: {
      name: string;
      code: string;
      city: string | null;
      country: string | null;
      full_address: string | null;
      phone: string | null;
      email: string | null;
    } | null;
    profiles: { full_name: string } | null;
    warehouse_locations: {
      name: string;
      code: string;
      warehouse_zones: { name: string; code: string } | { name: string; code: string }[] | null;
    } | null;
    warehouse_location_id: string | null;
    packages: PrintPackage[] | null;
    wr_notes: { id: string; content: string; created_at: string }[] | null;
  };
  settings: Record<string, string>;
  destination: { city: string; country_code: string } | null;
  org: { name: string; logo_url: string | null; slug: string | null } | null;
  warehouseLocations: { id: string; label: string }[];
  orgMembers: { id: string; name: string }[];
  locale: string;
}

/* ── Panel input: save-on-blur with live preview ── */

function PanelInput({
  label,
  value,
  onChange,
  onSave,
  type = "text",
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: (v: string) => Promise<{ error?: string }>;
  type?: "text" | "textarea";
  placeholder?: string;
  mono?: boolean;
}) {
  const [flash, setFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [focused, setFocused] = useState(false);
  const savedRef = useRef(value);
  const { notify } = useNotification();

  useEffect(() => {
    if (!focused) savedRef.current = value;
  }, [value, focused]);

  const handleBlur = () => {
    setFocused(false);
    const trimmed = value.trim();
    if (trimmed === savedRef.current.trim()) return;
    const originalValue = savedRef.current;
    startTransition(async () => {
      const result = await onSave(trimmed);
      if (result.error) {
        onChange(originalValue);
        notify(result.error, "error");
      } else {
        savedRef.current = trimmed;
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      }
    });
  };

  const baseClass = type === "textarea" ? platformTextareaClass : platformInputClass;
  const flashClass = flash ? "border-green-300 bg-green-50/50" : "";
  const monoClass = mono ? "font-mono" : "";

  return (
    <div>
      <label className="mb-1.5 block text-sm text-gray-600">{label}</label>
      <div className="relative">
        {type === "textarea" ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onChange(savedRef.current);
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
            placeholder={placeholder}
            rows={2}
            className={`${baseClass} ${flashClass} ${monoClass}`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onChange(savedRef.current);
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder={placeholder}
            className={`${baseClass} ${flashClass} ${monoClass}`}
          />
        )}
        {isPending && (
          <span className="absolute right-3 top-1/2 inline-block h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-400">
      {children}
    </p>
  );
}

/* ── Package edit modal ── */

function PackageEditModal({
  pkg,
  index,
  open,
  onClose,
  onSave,
  packageTypeOptions,
}: {
  pkg: PrintPackage;
  index: number;
  open: boolean;
  onClose: () => void;
  onSave: (pkgId: string, field: string) => (value: string) => Promise<{ error?: string }>;
  packageTypeOptions: { value: string; label: string }[];
}) {
  const { notify } = useNotification();
  const [tracking, setTracking] = useState(pkg.tracking_number);
  const [carrier, setCarrier] = useState(pkg.carrier ?? "");
  const [pkgType, setPkgType] = useState(pkg.package_type ?? "");
  const [weight, setWeight] = useState(pkg.actual_weight_lb != null ? String(pkg.actual_weight_lb) : "");
  const [length, setLength] = useState(pkg.length_in != null ? String(pkg.length_in) : "");
  const [width, setWidth] = useState(pkg.width_in != null ? String(pkg.width_in) : "");
  const [height, setHeight] = useState(pkg.height_in != null ? String(pkg.height_in) : "");
  const [pieces, setPieces] = useState(String(pkg.pieces_count));
  const [declaredValue, setDeclaredValue] = useState(pkg.declared_value_usd != null ? String(pkg.declared_value_usd) : "");
  const [saving, setSaving] = useState(false);

  const fields: { label: string; field: string; value: string; setter: (v: string) => void; type?: string; mono?: boolean; half?: boolean }[] = [
    { label: "Tracking", field: "tracking_number", value: tracking, setter: setTracking, mono: true },
    { label: "Carrier", field: "carrier", value: carrier, setter: setCarrier },
    { label: "Tipo", field: "package_type", value: pkgType, setter: setPkgType, type: "select" },
    { label: "Peso (lb)", field: "actual_weight_lb", value: weight, setter: setWeight, type: "number", half: true },
    { label: "Piezas", field: "pieces_count", value: pieces, setter: setPieces, type: "number", half: true },
    { label: "Largo (in)", field: "length_in", value: length, setter: setLength, type: "number", half: true },
    { label: "Ancho (in)", field: "width_in", value: width, setter: setWidth, type: "number", half: true },
    { label: "Alto (in)", field: "height_in", value: height, setter: setHeight, type: "number", half: true },
    { label: "Valor declarado ($)", field: "declared_value_usd", value: declaredValue, setter: setDeclaredValue, type: "number", half: true },
  ];

  const handleSaveField = async (field: string, value: string) => {
    setSaving(true);
    const result = await onSave(pkg.id, field)(value);
    setSaving(false);
    if (result.error) {
      notify(result.error, "error");
    }
    return result;
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        Paquete #{index + 1}
      </ModalHeader>
      <ModalBody>
        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.field} className={f.half ? "" : "col-span-2"}>
              <label className="mb-1.5 block text-sm text-gray-600">{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={f.value}
                  onChange={(e) => {
                    f.setter(e.target.value);
                    handleSaveField(f.field, e.target.value);
                  }}
                  className={platformSelectClass}
                >
                  <option value="">—</option>
                  {packageTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  step={f.type === "number" ? "any" : undefined}
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  onBlur={() => handleSaveField(f.field, f.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className={`${platformInputClass} ${f.mono ? "font-mono" : ""}`}
                />
              )}
            </div>
          ))}
        </div>
        {saving && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
            Guardando...
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}

/* ── Consignee typeahead for panel ── */

function ConsigneeTypeahead({
  wrId,
  agencyId,
  consigneeName,
  casillero,
  onSelect,
}: {
  wrId: string;
  agencyId: string | null;
  consigneeName: string | null;
  casillero: string | null;
  onSelect?: (name: string | null, casillero: string | null) => void;
}) {
  const [query, setQuery] = useState(consigneeName ?? "");
  const [results, setResults] = useState<{ id: string; full_name: string; casillero: string | null }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { notify } = useNotification();

  useEffect(() => {
    setQuery(consigneeName ?? "");
  }, [consigneeName]);

  useEffect(() => {
    if (query.length < 2 || query === consigneeName) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await searchConsignees(agencyId, query);
      const items = data ?? [];
      setResults(items);
      if (items.length > 0) setIsOpen(true);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, agencyId, consigneeName]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectConsignee = useCallback(
    (c: { id: string; full_name: string; casillero: string | null }) => {
      setQuery(c.full_name);
      setIsOpen(false);
      setResults([]);
      onSelect?.(c.full_name, c.casillero);
      startTransition(async () => {
        const result = await updateWarehouseReceiptField(wrId, "consignee_id", c.id);
        if (result.error) {
          setQuery(consigneeName ?? "");
          onSelect?.(consigneeName, casillero);
          notify(result.error, "error");
        }
      });
    },
    [wrId, consigneeName, casillero, notify, onSelect],
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (containerRef.current?.contains(document.activeElement)) return;
      setIsOpen(false);
      const trimmed = query.trim();
      if (trimmed && trimmed !== (consigneeName ?? "")) {
        onSelect?.(trimmed, null);
        startTransition(async () => {
          const result = await updateWarehouseReceiptField(wrId, "consignee_name", trimmed);
          if (result.error) {
            setQuery(consigneeName ?? "");
            onSelect?.(consigneeName, casillero);
            notify(result.error, "error");
          }
        });
      } else if (!trimmed) {
        setQuery(consigneeName ?? "");
      }
    }, 150);
  }, [query, wrId, consigneeName, casillero, notify, onSelect]);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.length >= 2) setIsOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery(consigneeName ?? "");
            setIsOpen(false);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Enter") {
            setIsOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Buscar consignatario..."
        className={platformInputClass}
      />
      {isPending && (
        <span className="absolute right-3 top-1/2 inline-block h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
      )}
      {isOpen && results.length > 0 && (
        <ul className="absolute left-0 z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
          {results.map((c) => (
            <li
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault();
                selectConsignee(c);
              }}
              className="cursor-pointer px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <span className="font-medium">{c.full_name}</span>
              {c.casillero && (
                <span className="ml-2 font-mono text-xs text-gray-400">{c.casillero}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Main component ── */

export function WrEditableDocument({
  wr,
  settings,
  destination,
  org,
  warehouseLocations,
  orgMembers,
  locale,
}: WrEditableDocumentProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotification();

  /* ── Lifted state (shared between panel + document) ── */
  const [wrNumber, setWrNumber] = useState(wr.wr_number);
  const [receivedAt, setReceivedAt] = useState(wr.received_at.slice(0, 16)); // datetime-local format
  const [receivedBy, setReceivedBy] = useState(wr.profiles ? (orgMembers.find((m) => m.name === wr.profiles!.full_name)?.id ?? "") : "");
  const [shipper, setShipper] = useState(wr.shipper_name ?? "");
  const [master, setMaster] = useState(wr.master_tracking ?? "");
  const [desc, setDesc] = useState(wr.content_description ?? wr.description ?? "");
  const [wrNotes, setWrNotes] = useState(wr.notes ?? "");
  const [locId, setLocId] = useState(wr.warehouse_location_id ?? "");
  const [consName, setConsName] = useState<string | null>(
    wr.consignees?.full_name ?? wr.consignee_name ?? null,
  );
  const [consCas, setConsCas] = useState<string | null>(wr.consignees?.casillero ?? null);
  const [flags, setFlags] = useState<string[]>(wr.condition_flags);
  const [editPkgIndex, setEditPkgIndex] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"recibo" | "envio" | "contenido" | "paquetes">("recibo");

  /* ── Barcode ── */
  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, wrNumber, {
        format: "CODE128",
        width: 1.5,
        height: 36,
        displayValue: false,
        margin: 0,
      });
    }
  }, [wrNumber]);

  /* ── Derived ── */
  const courier = wr.agencies?.couriers;
  const courierName = courier
    ? Array.isArray(courier) ? courier[0]?.name : courier.name
    : null;
  const [packages, setPackages] = useState<PrintPackage[]>(wr.packages ?? []);
  const destLabel = destination ? `${destination.city}, ${destination.country_code}` : null;
  const statusLabel = WR_STATUS_LABELS[wr.status as WrStatus] ?? wr.status;
  const statusColors: Record<string, string> = {
    received: "bg-blue-50 text-blue-700",
    in_warehouse: "bg-green-50 text-green-700",
    in_work_order: "bg-yellow-50 text-yellow-700",
    in_dispatch: "bg-purple-50 text-purple-700",
    dispatched: "bg-gray-100 text-gray-600",
    damaged: "bg-red-50 text-red-700",
    abandoned: "bg-gray-200 text-gray-500",
  };
  const receivedDate = new Date(receivedAt).toLocaleDateString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const receivedByName = orgMembers.find((m) => m.id === receivedBy)?.name ?? wr.profiles?.full_name ?? "—";

  /* ── Save functions (used by both panel and document) ── */
  const saveWrNumber = useCallback(async (value: string) => {
    const result = await updateWarehouseReceiptField(wr.id, "wr_number", value);
    if (!result.error) setWrNumber(value);
    return result;
  }, [wr.id]);

  const saveReceivedAt = useCallback(async (value: string) => {
    const result = await updateWarehouseReceiptField(wr.id, "received_at", value);
    if (!result.error) setReceivedAt(value);
    return result;
  }, [wr.id]);

  const saveReceivedBy = useCallback(async (value: string) => {
    const result = await updateWarehouseReceiptField(wr.id, "received_by", value);
    if (!result.error) setReceivedBy(value);
    return result;
  }, [wr.id]);

  const saveShipper = useCallback(async (value: string) => {
    const result = await updateWarehouseReceiptField(wr.id, "shipper_name", value);
    if (!result.error) setShipper(value);
    return result;
  }, [wr.id]);

  const saveMaster = useCallback(async (value: string) => {
    const result = await updateWarehouseReceiptField(wr.id, "master_tracking", value);
    if (!result.error) setMaster(value);
    return result;
  }, [wr.id]);

  const saveDesc = useCallback(async (value: string) => {
    const result = await updateWarehouseReceiptField(wr.id, "description", value);
    if (!result.error) setDesc(value);
    return result;
  }, [wr.id]);

  const saveNotes = useCallback(async (value: string) => {
    const result = await updateWarehouseReceiptField(wr.id, "notes", value);
    if (!result.error) setWrNotes(value);
    return result;
  }, [wr.id]);

  const saveLoc = useCallback(async (value: string) => {
    const result = await updateWarehouseReceiptField(wr.id, "warehouse_location_id", value);
    if (!result.error) setLocId(value);
    return result;
  }, [wr.id]);

  /* ── Sync callbacks for special components ── */
  const handleConsigneeChange = useCallback((name: string | null, cas: string | null) => {
    setConsName(name);
    setConsCas(cas);
  }, []);

  const handleFlagsChanged = useCallback((newFlags: string[]) => {
    setFlags(newFlags);
  }, []);

  /* ── Package field save (inline on document only) ── */
  const savePkgField = useCallback(
    (pkgId: string, field: string) => async (value: string) => {
      return updatePackageField(pkgId, field as Parameters<typeof updatePackageField>[1], value);
    },
    [],
  );

  /* ── Options ── */
  const locationOptions = warehouseLocations.map((loc) => ({
    value: loc.id,
    label: loc.label,
  }));

  const memberOptions = orgMembers.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const handlePrint = useCallback(() => {
    const originalTitle = document.title;
    const date = new Date(receivedAt).toISOString().slice(0, 10);
    document.title = `[NOWMS] ${wrNumber} - ${date}`;
    window.print();
    document.title = originalTitle;
  }, [wrNumber, receivedAt]);

  const handleDownload = useCallback(async () => {
    const el = documentRef.current;
    if (!el) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const date = new Date(receivedAt).toISOString().slice(0, 10);
    const filename = `[NOWMS] ${wrNumber} - ${date}.pdf`;
    html2pdf()
      .set({
        margin: [0.4, 0.5, 0.4, 0.5],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .from(el)
      .save();
  }, [wrNumber, receivedAt]);

  const [addingPkg, startAddPkg] = useTransition();
  const handleAddPackage = useCallback(() => {
    const tracking = prompt("Tracking number del nuevo paquete:");
    if (!tracking?.trim()) return;
    startAddPkg(async () => {
      const result = await addPackageToWarehouseReceipt(wr.id, tracking);
      if (result.error) {
        notify(result.error, "error");
        return;
      }
      if (result.data) {
        setPackages((prev) => [
          ...prev,
          {
            id: result.data!.id,
            tracking_number: result.data!.tracking_number,
            carrier: null,
            actual_weight_lb: null,
            billable_weight_lb: null,
            length_in: null,
            width_in: null,
            height_in: null,
            pieces_count: 1,
            package_type: null,
            declared_value_usd: null,
          },
        ]);
        setSidebarTab("paquetes");
      }
    });
  }, [wr.id, notify]);

  const packageTypeOptions = PACKAGE_TYPES.map((pt) => ({
    value: pt,
    label: pt,
  }));

  return (
    <div className="flex h-full print:block print:h-auto">
      {/* ══════════════════════════════════════════════════
          LEFT PANEL — Editing toolbar (lg+ only)
          ══════════════════════════════════════════════════ */}
      <div className="hidden w-96 shrink-0 overflow-y-auto p-6 pr-3 lg:block print:hidden">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* ── Header ── */}
          <div className="border-b border-gray-100 px-5 py-3">
            <div className="flex items-center justify-between">
              <p className="truncate font-mono text-base font-bold tracking-tight text-gray-900">{wrNumber}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[wr.status] ?? "bg-gray-100 text-gray-600"}`}>
                {statusLabel}
              </span>
            </div>
            {/* Actions */}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12Zm-12 0h.008v.008H6.75V12Z" />
                </svg>
                Imprimir
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Descargar
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          {(() => {
            const tabs = [
              { key: "recibo" as const, label: "Recibo" },
              { key: "envio" as const, label: "Envio" },
              { key: "contenido" as const, label: "Contenido" },
              { key: "paquetes" as const, label: `Paquetes (${packages.length})` },
            ];
            return (
              <div className="flex border-b border-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSidebarTab(tab.key)}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                      sidebarTab === tab.key
                        ? "border-b-2 border-gray-900 text-gray-900"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* ── Tab content ── */}
          <div className="px-5 py-4">
            {sidebarTab === "recibo" && (
              <div className="space-y-4">
                <PanelInput
                  label="Numero de WR"
                  value={wrNumber}
                  onChange={setWrNumber}
                  onSave={saveWrNumber}
                  placeholder="WR-0001"
                  mono
                />
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Fecha de recibo</label>
                  <input
                    type="datetime-local"
                    value={receivedAt}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      const old = receivedAt;
                      setReceivedAt(newVal);
                      saveReceivedAt(newVal).then((res) => {
                        if (res.error) {
                          setReceivedAt(old);
                          notify(res.error, "error");
                        }
                      });
                    }}
                    className={platformInputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Recibido por</label>
                  <select
                    value={receivedBy}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      const old = receivedBy;
                      setReceivedBy(newVal);
                      saveReceivedBy(newVal).then((res) => {
                        if (res.error) {
                          setReceivedBy(old);
                          notify(res.error, "error");
                        }
                      });
                    }}
                    className={platformSelectClass}
                  >
                    <option value="">— Seleccionar —</option>
                    {memberOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Ubicacion</label>
                  <select
                    value={locId}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      const old = locId;
                      setLocId(newVal);
                      updateWarehouseReceiptField(wr.id, "warehouse_location_id", newVal).then((res) => {
                        if (res.error) {
                          setLocId(old);
                          notify(res.error, "error");
                        }
                      });
                    }}
                    className={platformSelectClass}
                  >
                    <option value="">— Sin asignar —</option>
                    {locationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {sidebarTab === "envio" && (
              <div className="space-y-4">
                <PanelInput
                  label="Shipper / Remitente"
                  value={shipper}
                  onChange={setShipper}
                  onSave={saveShipper}
                  placeholder="Nombre del remitente"
                />
                <PanelInput
                  label="Master Tracking"
                  value={master}
                  onChange={setMaster}
                  onSave={saveMaster}
                  placeholder="Guia master"
                  mono
                />
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Consignatario</label>
                  <ConsigneeTypeahead
                    wrId={wr.id}
                    agencyId={wr.agency_id}
                    consigneeName={consName}
                    casillero={consCas}
                    onSelect={handleConsigneeChange}
                  />
                </div>
              </div>
            )}

            {sidebarTab === "contenido" && (
              <div className="space-y-4">
                <PanelInput
                  label="Descripcion de bienes"
                  value={desc}
                  onChange={setDesc}
                  onSave={saveDesc}
                  type="textarea"
                  placeholder="Descripcion de bienes..."
                />
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Condicion</label>
                  <ConditionFlagsInlineEdit
                    wrId={wr.id}
                    flags={flags}
                    onFlagsChange={handleFlagsChanged}
                  />
                </div>
                <PanelInput
                  label="Notas"
                  value={wrNotes}
                  onChange={setWrNotes}
                  onSave={saveNotes}
                  type="textarea"
                  placeholder="Agregar notas..."
                />
              </div>
            )}

            {sidebarTab === "paquetes" && (
              <div className="space-y-1.5">
                {packages.map((pkg, i) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setEditPkgIndex(i)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-2 text-left transition-colors hover:border-gray-200 hover:bg-gray-50"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-gray-900">
                        {pkg.tracking_number}
                      </p>
                      <p className="text-xs text-gray-400">
                        {pkg.actual_weight_lb != null ? `${pkg.actual_weight_lb} lb` : "Sin peso"}
                        {pkg.package_type && ` · ${pkg.package_type}`}
                      </p>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAddPackage}
                  disabled={addingPkg}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  {addingPkg ? "Agregando..." : "Agregar paquete"}
                </button>
              </div>
            )}
          </div>

          {/* ── Footer hint ── */}
          <div className="border-t border-gray-100 px-5 py-2.5">
            <p className="text-center text-xs text-gray-400">
              Los cambios se guardan automaticamente
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          DOCUMENT — Live preview with inline editing
          ══════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-6 lg:pl-3 print:overflow-visible print:p-0">
      <div ref={documentRef} className="mx-auto max-w-[7.5in] overflow-hidden rounded-sm bg-white text-slate-900 shadow-xl ring-1 ring-slate-200/60 print:max-w-none print:overflow-visible print:rounded-none print:shadow-none print:ring-0">
      <div className="px-8 py-6 print:px-[0.5in] print:py-[0.4in]">
        {/* ── 1. Header ── */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {org?.logo_url ? (
                <img src={org.logo_url} alt="" className="h-9 w-9 rounded-md object-contain" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900">
                  <span className="text-sm font-bold text-white">
                    {(org?.name ?? wr.warehouses?.name ?? "W")[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{org?.name ?? wr.warehouses?.name ?? "Warehouse"}</p>
                {wr.warehouses?.full_address && (
                  <p className="text-[13px] text-slate-400">{wr.warehouses.full_address}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-xl font-bold tracking-tight text-slate-900">
                <EditableField
                  value={wrNumber}
                  onSave={saveWrNumber}
                  placeholder="WR-0001"
                  className="font-mono"
                />
              </p>
              <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[13px] font-medium text-slate-500">
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-100" />
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Recibo de Bodega &middot; Warehouse Receipt
            </p>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
        </div>

        {/* ── 2. Receipt details strip ── */}
        <div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50/60 px-4 py-3 text-[13px] print:bg-slate-50">
          <div>
            <p className="text-slate-400">Fecha / Date</p>
            <p className="font-medium text-slate-700">
              <EditableField
                value={receivedAt}
                onSave={saveReceivedAt}
                formatDisplay={() => receivedDate}
                className="text-slate-700"
              />
            </p>
          </div>
          <div>
            <p className="text-slate-400">Recibido por</p>
            <p className="font-medium text-slate-700">
              <EditableField
                value={receivedBy}
                onSave={saveReceivedBy}
                type="select"
                options={memberOptions}
                emptyText="—"
                formatDisplay={() => receivedByName}
              />
            </p>
          </div>
          <div>
            <p className="text-slate-400">Ubicacion</p>
            <p className="font-medium text-slate-700">
              <EditableField
                value={locId}
                onSave={saveLoc}
                type="select"
                options={locationOptions}
                emptyText="Sin asignar"
                formatDisplay={(v) => {
                  if (!v) return "";
                  const loc = warehouseLocations.find((l) => l.id === String(v));
                  return loc?.label ?? String(v);
                }}
              />
            </p>
          </div>
          <div>
            <p className="text-slate-400">Bodega</p>
            <p className="font-medium text-slate-700">
              {wr.warehouses?.name ?? "—"}{" "}
              <span className="text-slate-400">({wr.warehouses?.code})</span>
            </p>
          </div>
        </div>

        {/* ── 3. Parties ── */}
        <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-4">
          {/* Depositor */}
          <div className="rounded-lg border border-slate-200 px-4 py-3">
            <SectionLabel>Depositante / Depositor</SectionLabel>
            <p className="text-sm font-semibold text-slate-900">
              {wr.agencies ? wr.agencies.name : "Desconocido"}
              {wr.agencies && (
                <span className="ml-1.5 font-mono text-[13px] font-normal text-slate-400">
                  {wr.agencies.code}
                </span>
              )}
            </p>
            <div className="mt-1.5 space-y-1 text-[13px]">
              {packages[0] && (
                <div className="flex gap-1.5">
                  <span className="shrink-0 text-slate-400">Carrier:</span>
                  <EditableField
                    value={packages[0].carrier}
                    onSave={savePkgField(packages[0].id, "carrier")}
                    placeholder="Carrier"
                    emptyText="—"
                    className="text-slate-700"
                  />
                </div>
              )}
              {courierName && (
                <div className="flex gap-1.5">
                  <span className="shrink-0 text-slate-400">Courier:</span>
                  <span className="text-slate-700">{courierName}</span>
                </div>
              )}
              <div className="flex gap-1.5">
                <span className="shrink-0 text-slate-400">Shipper:</span>
                <EditableField
                  value={shipper}
                  onSave={saveShipper}
                  placeholder="Nombre del remitente"
                  emptyText="—"
                  className="text-slate-700"
                />
              </div>
              <div className="flex gap-1.5">
                <span className="shrink-0 text-slate-400">Master:</span>
                <EditableField
                  value={master}
                  onSave={saveMaster}
                  placeholder="Guia master"
                  emptyText="—"
                  className="font-mono text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Consignee */}
          <div className="rounded-lg border border-slate-200 px-4 py-3">
            <SectionLabel>Consignatario / Consignee</SectionLabel>
            <div className="text-sm">
              <ConsigneeInlineEdit
                wrId={wr.id}
                agencyId={wr.agency_id}
                consigneeName={consName}
                casillero={consCas}
                onSelect={handleConsigneeChange}
              />
            </div>
            {destLabel && (
              <div className="mt-1.5 flex gap-1.5 text-[13px]">
                <span className="shrink-0 text-slate-400">Destino:</span>
                <span className="text-slate-700">{destLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Goods description ── */}
        <div className="border-b border-slate-200 py-4">
          <SectionLabel>Descripcion de bienes / Description of Goods</SectionLabel>
          <div className="mb-2 text-sm">
            <EditableField
              value={desc}
              onSave={saveDesc}
              type="textarea"
              placeholder="Descripcion de bienes..."
              emptyText="Sin descripcion"
              className="text-slate-700"
            />
          </div>
          <p className="mb-3 text-xs italic text-slate-400">
            Received in apparent good order, except as noted. Contents, condition, and quality unknown.
          </p>

          {packages.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full table-fixed text-[13px]">
                <colgroup>
                  <col className="w-[5%]" />
                  <col className="w-[40%]" />
                  <col className="w-[13%]" />
                  <col className="w-[14%]" />
                  <col className="w-[28%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Tracking</th>
                    <th className="px-2 py-2">Tipo</th>
                    <th className="px-2 py-2 text-right">Peso (lb)</th>
                    <th className="px-2 py-2 text-center">Dim (in)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {packages.map((pkg, i) => (
                    <tr key={pkg.id} className="text-slate-700">
                      <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-2 py-1.5 font-mono font-medium">
                        <EditableField
                          value={pkg.tracking_number}
                          onSave={savePkgField(pkg.id, "tracking_number")}
                          placeholder="Tracking"
                          className="font-mono"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <EditableField
                          value={pkg.package_type}
                          onSave={savePkgField(pkg.id, "package_type")}
                          type="select"
                          options={packageTypeOptions}
                          emptyText="—"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <EditableField
                          value={pkg.actual_weight_lb}
                          onSave={savePkgField(pkg.id, "actual_weight_lb")}
                          type="number"
                          emptyText="—"
                          className="tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-center gap-0.5 tabular-nums">
                          <EditableField
                            value={pkg.length_in}
                            onSave={savePkgField(pkg.id, "length_in")}
                            type="number"
                            emptyText="—"
                            className="tabular-nums"
                            inputClassName="w-10"
                          />
                          <span className="text-slate-300">×</span>
                          <EditableField
                            value={pkg.width_in}
                            onSave={savePkgField(pkg.id, "width_in")}
                            type="number"
                            emptyText="—"
                            className="tabular-nums"
                            inputClassName="w-10"
                          />
                          <span className="text-slate-300">×</span>
                          <EditableField
                            value={pkg.height_in}
                            onSave={savePkgField(pkg.id, "height_in")}
                            type="number"
                            emptyText="—"
                            className="tabular-nums"
                            inputClassName="w-10"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-[13px] font-semibold text-slate-700">
                    <td colSpan={2} className="px-2 py-2">
                      {wr.total_packages ?? packages.length} paquete(s)
                    </td>
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2 text-right tabular-nums">
                      {wr.total_actual_weight_lb ?? "—"} lb
                    </td>
                    <td className="px-2 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <button
            type="button"
            onClick={handleAddPackage}
            disabled={addingPkg}
            className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 transition-colors hover:text-blue-800 disabled:opacity-50 print:hidden"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            {addingPkg ? "Agregando..." : "Agregar paquete"}
          </button>
        </div>

        {/* ── 5. Condition ── */}
        <div className="border-b border-slate-200 py-3">
          <SectionLabel>Condicion de ingreso / Condition on Arrival</SectionLabel>
          <ConditionFlagsInlineEdit wrId={wr.id} flags={flags} onFlagsChange={handleFlagsChanged} />
        </div>

        {/* ── 6. Notes ── */}
        <div className="border-b border-slate-200 py-3">
          <SectionLabel>Notas / Notes</SectionLabel>
          <div className="text-sm">
            <EditableField
              value={wrNotes}
              onSave={saveNotes}
              type="textarea"
              placeholder="Agregar notas..."
              emptyText="Sin notas"
              className="text-slate-700"
            />
          </div>
          {wr.wr_notes && wr.wr_notes.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {wr.wr_notes.map((note) => (
                <p key={note.id} className="text-[13px] text-slate-500">{note.content}</p>
              ))}
            </div>
          )}
        </div>

        {/* ── 7. Footer ── */}
        <div className="flex items-end justify-between border-t border-slate-200 pt-3">
          <div>
            <svg ref={barcodeRef} />
            <p className="mt-1 font-mono text-[13px] font-medium text-slate-500">{wr.wr_number}</p>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <p>UCC Article 7 &middot; FL Stat. Ch. 677</p>
            <p>{new Date().toISOString().slice(0, 19).replace("T", " ")} UTC</p>
          </div>
        </div>
      </div>
      </div>
      </div>

      {/* ── Compact controls for narrow screens ── */}
      <div className="fixed bottom-5 right-5 z-10 flex gap-2 lg:hidden print:hidden">
        <Link
          href={`/${locale}/warehouse-receipts/${wr.id}`}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
        >
          &larr; Volver
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-gray-800"
        >
          Imprimir
        </button>
      </div>

      {/* ── Package edit modal ── */}
      {editPkgIndex != null && packages[editPkgIndex] && (
        <PackageEditModal
          pkg={packages[editPkgIndex]}
          index={editPkgIndex}
          open
          onClose={() => setEditPkgIndex(null)}
          onSave={savePkgField}
          packageTypeOptions={packageTypeOptions}
        />
      )}
    </div>
  );
}
