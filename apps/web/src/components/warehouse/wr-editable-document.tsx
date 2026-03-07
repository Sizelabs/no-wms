"use client";

import { PACKAGE_TYPES } from "@no-wms/shared/constants/package-types";
import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import JsBarcode from "jsbarcode";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
      {children}
    </p>
  );
}

export function WrEditableDocument({
  wr,
  settings,
  destination,
  org,
  warehouseLocations,
  locale,
}: WrEditableDocumentProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

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

  const saveWrField = useCallback(
    (field: string) => async (value: string) => {
      return updateWarehouseReceiptField(wr.id, field as Parameters<typeof updateWarehouseReceiptField>[1], value);
    },
    [wr.id],
  );

  const savePkgField = useCallback(
    (pkgId: string, field: string) => async (value: string) => {
      return updatePackageField(pkgId, field as Parameters<typeof updatePackageField>[1], value);
    },
    [],
  );

  const locationOptions = warehouseLocations.map((loc) => ({
    value: loc.id,
    label: loc.label,
  }));

  const packageTypeOptions = PACKAGE_TYPES.map((pt) => ({
    value: pt,
    label: pt,
  }));

  return (
    <div className="flex items-start justify-center gap-5">
      {/* ── Document paper ── */}
      <div className="max-w-[7.5in] shrink-0 rounded-sm bg-white text-slate-900 shadow-xl ring-1 ring-slate-200/60 print:max-w-none print:rounded-none print:shadow-none print:ring-0">
      <div className="px-8 py-6 print:px-0 print:py-0">
        {/* ── 1. Header ── */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between">
            {/* Left: Branding */}
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
                  <p className="text-[10px] text-slate-400">{wr.warehouses.full_address}</p>
                )}
              </div>
            </div>

            {/* Right: WR Number hero */}
            <div className="text-right">
              <p className="font-mono text-xl font-bold tracking-tight text-slate-900">
                {wr.wr_number}
              </p>
              <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Document title strip */}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-100" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Recibo de Bodega &middot; Warehouse Receipt
            </p>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <p className="mt-1 text-center text-[9px] font-medium text-slate-400">
            No Negociable &middot; Nonnegotiable
          </p>
        </div>

        {/* ── 2. Receipt details strip ── */}
        <div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50/60 px-4 py-3 text-[10px] print:bg-slate-50">
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
                value={wr.warehouse_location_id}
                onSave={saveWrField("warehouse_location_id")}
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
            <p className="text-[11px] font-semibold text-slate-900">
              {wr.agencies ? wr.agencies.name : "Desconocido"}
              {wr.agencies && (
                <span className="ml-1.5 font-mono text-[10px] font-normal text-slate-400">
                  {wr.agencies.code}
                </span>
              )}
            </p>
            <div className="mt-1.5 space-y-1 text-[10px]">
              {courierName && (
                <div className="flex gap-1.5">
                  <span className="shrink-0 text-slate-400">Courier:</span>
                  <span className="text-slate-700">{courierName}</span>
                </div>
              )}
              <div className="flex gap-1.5">
                <span className="shrink-0 text-slate-400">Shipper:</span>
                <EditableField
                  value={wr.shipper_name}
                  onSave={saveWrField("shipper_name")}
                  placeholder="Nombre del remitente"
                  emptyText="—"
                  className="text-slate-700"
                />
              </div>
              <div className="flex gap-1.5">
                <span className="shrink-0 text-slate-400">Master:</span>
                <EditableField
                  value={wr.master_tracking}
                  onSave={saveWrField("master_tracking")}
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
            <div className="text-[11px]">
              <ConsigneeInlineEdit
                wrId={wr.id}
                agencyId={wr.agency_id}
                consigneeName={wr.consignees?.full_name ?? wr.consignee_name}
                casillero={wr.consignees?.casillero ?? null}
              />
            </div>
            {destLabel && (
              <div className="mt-1.5 flex gap-1.5 text-[10px]">
                <span className="shrink-0 text-slate-400">Destino:</span>
                <span className="text-slate-700">{destLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Goods description ── */}
        <div className="border-b border-slate-200 py-4">
          <SectionLabel>Descripcion de bienes / Description of Goods</SectionLabel>
          <div className="mb-2 text-[11px]">
            <EditableField
              value={wr.content_description ?? wr.description}
              onSave={saveWrField("description")}
              type="textarea"
              placeholder="Descripcion de bienes..."
              emptyText="Sin descripcion"
              className="text-slate-700"
            />
          </div>
          <p className="mb-3 text-[9px] italic text-slate-400">
            Received in apparent good order, except as noted. Contents, condition, and quality unknown.
          </p>

          {packages.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-400">
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
                  <tr className="border-t border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-700">
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
          <ConditionFlagsInlineEdit wrId={wr.id} flags={wr.condition_flags} />
        </div>

        {/* ── 6. Notes ── */}
        <div className="border-b border-slate-200 py-3">
          <SectionLabel>Notas / Notes</SectionLabel>
          <div className="text-[11px]">
            <EditableField
              value={wr.notes}
              onSave={saveWrField("notes")}
              type="textarea"
              placeholder="Agregar notas..."
              emptyText="Sin notas"
              className="text-slate-700"
            />
          </div>
          {wr.wr_notes && wr.wr_notes.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {wr.wr_notes.map((note) => (
                <p key={note.id} className="text-[10px] text-slate-500">{note.content}</p>
              ))}
            </div>
          )}
        </div>

        {/* ── 7. Legal block ── */}
        <div className="border-b border-slate-200 py-3">
          <SectionLabel>Terminos y condiciones / Terms &amp; Conditions</SectionLabel>
          <div className="space-y-1 text-[9px] leading-relaxed text-slate-500">
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
            <p className="mt-1 font-mono text-[10px] font-medium text-slate-500">{wr.wr_number}</p>
          </div>
          <div className="text-right text-[8px] text-slate-400">
            <p>UCC Article 7 &middot; FL Stat. Ch. 677</p>
            <p>{new Date().toISOString().slice(0, 19).replace("T", " ")} UTC</p>
          </div>
        </div>
      </div>
      </div>

      {/* ── Side panel ── */}
      <div className="sticky top-6 hidden w-44 shrink-0 xl:block print:hidden">
        <div className="space-y-4">
          <Link
            href={`/${locale}/inventory/${wr.id}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <span>&larr;</span>
            <span>Volver al detalle</span>
          </Link>

          <div>
            <p className="font-mono text-sm font-semibold text-slate-900">{wr.wr_number}</p>
            <span className="mt-1 inline-block rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              {statusLabel}
            </span>
          </div>

          <div className="h-px bg-slate-200" />

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            Imprimir
          </button>

          <div className="h-px bg-slate-200" />

          <p className="text-[11px] leading-relaxed text-slate-400">
            Haz clic en cualquier campo resaltado para editarlo. Los cambios se guardan automaticamente.
          </p>
        </div>
      </div>

      {/* ── Compact controls for narrow screens ── */}
      <div className="fixed bottom-5 right-5 z-10 flex gap-2 xl:hidden print:hidden">
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
