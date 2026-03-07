"use client";

import { PACKAGE_TYPES } from "@no-wms/shared/constants/package-types";
import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import JsBarcode from "jsbarcode";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { EditableField } from "@/components/ui/editable-field";
import { ConditionFlagsInlineEdit } from "@/components/warehouse/condition-flags-inline-edit";
import { ConsigneeInlineEdit } from "@/components/warehouse/consignee-inline-edit";
import {
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
    startTransition(async () => {
      const result = await onSave(trimmed);
      if (result.error) {
        onChange(savedRef.current);
        notify(result.error, "error");
      } else {
        savedRef.current = trimmed;
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      }
    });
  };

  const inputClass = `w-full rounded-md border px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:outline-none transition-colors ${
    flash ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"
  } ${mono ? "font-mono" : ""}`;

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
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
            className={inputClass}
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
            className={inputClass}
          />
        )}
        {isPending && (
          <span className="absolute right-2 top-1/2 inline-block h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
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

/* ── Main component ── */

export function WrEditableDocument({
  wr,
  settings,
  destination,
  org,
  warehouseLocations,
  locale,
}: WrEditableDocumentProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const { notify } = useNotification();

  /* ── Lifted state (shared between panel + document) ── */
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

  /* ── Barcode ── */
  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, wr.wr_number, {
        format: "CODE128",
        width: 1.5,
        height: 36,
        displayValue: false,
        margin: 0,
      });
    }
  }, [wr.wr_number]);

  /* ── Derived ── */
  const courier = wr.agencies?.couriers;
  const courierName = courier
    ? Array.isArray(courier) ? courier[0]?.name : courier.name
    : null;
  const destLabel = destination ? `${destination.city}, ${destination.country_code}` : null;
  const packages = wr.packages ?? [];
  const statusLabel = WR_STATUS_LABELS[wr.status as WrStatus] ?? wr.status;
  const receivedDate = new Date(wr.received_at).toLocaleDateString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  /* ── Save functions (used by both panel and document) ── */
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

  const packageTypeOptions = PACKAGE_TYPES.map((pt) => ({
    value: pt,
    label: pt,
  }));

  return (
    <div className="flex items-start justify-center gap-6">
      {/* ══════════════════════════════════════════════════
          LEFT PANEL — Form inputs (lg+ only)
          ══════════════════════════════════════════════════ */}
      <div className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-72 shrink-0 overflow-y-auto lg:block print:hidden">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-100 px-5 py-4">
            <Link
              href={`/${locale}/inventory/${wr.id}`}
              className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              <span>&larr;</span>
              <span>Volver al detalle</span>
            </Link>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="font-mono text-lg font-bold text-slate-900">{wr.wr_number}</p>
                <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {statusLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                Imprimir
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4 px-5 py-4">
            {/* Location */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Ubicacion</label>
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
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:outline-none"
              >
                <option value="">— Sin asignar —</option>
                {locationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

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

            {/* Consignee */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Consignatario</label>
              <ConsigneeInlineEdit
                wrId={wr.id}
                agencyId={wr.agency_id}
                consigneeName={consName}
                casillero={consCas}
                onSelect={handleConsigneeChange}
              />
            </div>

            <div className="h-px bg-slate-100" />

            <PanelInput
              label="Descripcion de bienes"
              value={desc}
              onChange={setDesc}
              onSave={saveDesc}
              type="textarea"
              placeholder="Descripcion de bienes..."
            />

            {/* Condition flags */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Condicion</label>
              <ConditionFlagsInlineEdit
                wrId={wr.id}
                flags={flags}
                onFlagsChange={handleFlagsChanged}
              />
            </div>

            <div className="h-px bg-slate-100" />

            <PanelInput
              label="Notas"
              value={wrNotes}
              onChange={setWrNotes}
              onSave={saveNotes}
              type="textarea"
              placeholder="Agregar notas..."
            />

            <div className="h-px bg-slate-100" />

            <p className="text-[11px] leading-relaxed text-slate-400">
              Edita aqui o directamente en el documento. Los cambios se guardan automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          DOCUMENT — Live preview with inline editing
          ══════════════════════════════════════════════════ */}
      <div className="max-w-[7.5in] shrink-0 rounded-sm bg-white text-slate-900 shadow-xl ring-1 ring-slate-200/60 print:max-w-none print:rounded-none print:shadow-none print:ring-0">
      <div className="px-8 py-6 print:px-0 print:py-0">
        {/* ── 1. Header ── */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {org?.logo_url ? (
                <img src={org.logo_url} alt="" className="h-9 w-9 rounded-md object-contain" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900">
                  <span className="text-sm font-bold text-white">
                    {(org?.name ?? "W")[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{org?.name ?? "Warehouse"}</p>
                {wr.warehouses?.full_address && (
                  <p className="text-[13px] text-slate-400">{wr.warehouses.full_address}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-xl font-bold tracking-tight text-slate-900">
                {wr.wr_number}
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
          <p className="mt-1 text-center text-xs font-medium text-slate-400">
            No Negociable &middot; Nonnegotiable
          </p>
        </div>

        {/* ── 2. Receipt details strip ── */}
        <div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50/60 px-4 py-3 text-[13px] print:bg-slate-50">
          <div>
            <p className="text-slate-400">Fecha / Date</p>
            <p className="font-medium text-slate-700">{receivedDate}</p>
          </div>
          <div>
            <p className="text-slate-400">Recibido por</p>
            <p className="font-medium text-slate-700">{wr.profiles?.full_name ?? "—"}</p>
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
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Tracking</th>
                    <th className="px-3 py-2">Carrier</th>
                    <th className="px-3 py-2 text-right">Pzs</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2 text-right">Peso (lb)</th>
                    <th className="px-3 py-2 text-right">L</th>
                    <th className="px-3 py-2 text-right">W</th>
                    <th className="px-3 py-2 text-right">H</th>
                    <th className="px-3 py-2 text-right">Cobrable (lb)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {packages.map((pkg, i) => (
                    <tr key={pkg.id} className="text-slate-700">
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-mono font-medium">{pkg.tracking_number}</td>
                      <td className="px-3 py-1.5">{pkg.carrier ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right">
                        <EditableField
                          value={pkg.pieces_count}
                          onSave={savePkgField(pkg.id, "pieces_count")}
                          type="number"
                          emptyText="1"
                          className="tabular-nums"
                          inputClassName="w-12"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <EditableField
                          value={pkg.package_type}
                          onSave={savePkgField(pkg.id, "package_type")}
                          type="select"
                          options={packageTypeOptions}
                          emptyText="—"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <EditableField
                          value={pkg.actual_weight_lb}
                          onSave={savePkgField(pkg.id, "actual_weight_lb")}
                          type="number"
                          emptyText="—"
                          className="tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <EditableField
                          value={pkg.length_in}
                          onSave={savePkgField(pkg.id, "length_in")}
                          type="number"
                          emptyText="—"
                          className="tabular-nums"
                          inputClassName="w-12"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <EditableField
                          value={pkg.width_in}
                          onSave={savePkgField(pkg.id, "width_in")}
                          type="number"
                          emptyText="—"
                          className="tabular-nums"
                          inputClassName="w-12"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <EditableField
                          value={pkg.height_in}
                          onSave={savePkgField(pkg.id, "height_in")}
                          type="number"
                          emptyText="—"
                          className="tabular-nums"
                          inputClassName="w-12"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium text-slate-500">
                        {pkg.billable_weight_lb ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-[13px] font-semibold text-slate-700">
                    <td colSpan={3} className="px-3 py-2">
                      {wr.total_packages ?? packages.length} paquete(s)
                    </td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right tabular-nums">
                      {wr.total_actual_weight_lb ?? "—"} lb
                    </td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right tabular-nums">
                      {wr.total_billable_weight_lb ?? "—"} lb
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
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

        {/* ── 7. Legal block ── */}
        <div className="border-b border-slate-200 py-3">
          <SectionLabel>Terminos y condiciones / Terms &amp; Conditions</SectionLabel>
          <div className="space-y-1 text-xs leading-relaxed text-slate-500">
            {settings.wr_storage_charges_text && (
              <p><span className="font-medium text-slate-600">Storage:</span> {settings.wr_storage_charges_text}</p>
            )}
            {settings.wr_lien_statement && (
              <p><span className="font-medium text-slate-600">Liens:</span> {settings.wr_lien_statement}</p>
            )}
            {settings.wr_ownership_statement && (
              <p><span className="font-medium text-slate-600">Ownership:</span> {settings.wr_ownership_statement}</p>
            )}
            {settings.wr_liability_per_pound && (
              <p><span className="font-medium text-slate-600">Liability:</span> Limited to ${settings.wr_liability_per_pound}/lb per article unless declared value stated and additional charges paid.</p>
            )}
            {settings.wr_delivery_statement && (
              <p><span className="font-medium text-slate-600">Delivery:</span> {settings.wr_delivery_statement}</p>
            )}
            {settings.wr_terms_url && (
              <p><span className="font-medium text-slate-600">Full T&amp;C:</span> {settings.wr_terms_url}</p>
            )}
          </div>
        </div>

        {/* ── 8. Footer ── */}
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

      {/* ── Compact controls for narrow screens ── */}
      <div className="fixed bottom-5 right-5 z-10 flex gap-2 lg:hidden print:hidden">
        <Link
          href={`/${locale}/inventory/${wr.id}`}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
        >
          &larr; Volver
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-slate-800"
        >
          Imprimir
        </button>
      </div>
    </div>
  );
}
