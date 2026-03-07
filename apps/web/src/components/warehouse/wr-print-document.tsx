"use client";

import type { ConditionFlag } from "@no-wms/shared/constants/condition-flags";
import {
  CONDITION_FLAG_LABELS_EN,
  CONDITION_FLAG_LABELS_ES,
} from "@no-wms/shared/constants/condition-flags";
import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import JsBarcode from "jsbarcode";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

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

interface WrPrintDocumentProps {
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
    agencies: {
      name: string;
      code: string;
      type: string;
      couriers: { name: string; code: string } | { name: string; code: string }[] | null;
    } | null;
    consignee_name: string | null;
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
    packages: PrintPackage[] | null;
    wr_notes: { id: string; content: string; created_at: string }[] | null;
  };
  settings: Record<string, string>;
  destination: { city: string; country_code: string } | null;
  org: { name: string; logo_url: string | null; slug: string | null } | null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
      {children}
    </p>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5 text-[10px]">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-slate-700">{children}</span>
    </div>
  );
}

export function WrPrintDocument({ wr, settings, destination, org }: WrPrintDocumentProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const searchParams = useSearchParams();

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

  useEffect(() => {
    if (searchParams.get("auto") === "true") {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const courier = wr.agencies?.couriers;
  const courierName = courier
    ? Array.isArray(courier) ? courier[0]?.name : courier.name
    : null;

  const zone = wr.warehouse_locations?.warehouse_zones;
  const zoneName = zone ? (Array.isArray(zone) ? zone[0]?.name : zone.name) : null;

  const destLabel = destination ? `${destination.city}, ${destination.country_code}` : null;

  const packages = wr.packages ?? [];
  const carrierName = packages[0]?.carrier ?? null;
  const hasNoExceptions = wr.condition_flags.includes("sin_novedad");

  const statusLabel = WR_STATUS_LABELS[wr.status as WrStatus] ?? wr.status;
  const receivedDate = new Date(wr.received_at).toLocaleDateString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-[7.5in] bg-white text-slate-900">
      {/* ── Screen-only toolbar ── */}
      <div className="mb-6 flex gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>

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
            {wr.warehouse_locations
              ? `${zoneName ? `${zoneName} / ` : ""}${wr.warehouse_locations.code}`
              : "—"}
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
          <div className="mt-1.5 space-y-0.5">
            {carrierName && <DetailRow label="Carrier:">{carrierName}</DetailRow>}
            {courierName && <DetailRow label="Courier:">{courierName}</DetailRow>}
            {wr.shipper_name && <DetailRow label="Shipper:">{wr.shipper_name}</DetailRow>}
            {wr.master_tracking && (
              <DetailRow label="Master:">
                <span className="font-mono">{wr.master_tracking}</span>
              </DetailRow>
            )}
          </div>
        </div>

        {/* Consignee */}
        <div className="rounded-lg border border-slate-200 px-4 py-3">
          <SectionLabel>Consignatario / Consignee</SectionLabel>
          <p className="text-[11px] font-semibold text-slate-900">
            {wr.consignees?.full_name ?? wr.consignee_name ?? (
              <span className="font-normal italic text-slate-400">Sin asignar</span>
            )}
          </p>
          <div className="mt-1.5 space-y-0.5">
            {wr.consignees?.casillero && (
              <DetailRow label="Casillero:">
                <span className="font-mono">{wr.consignees.casillero}</span>
              </DetailRow>
            )}
            {destLabel && <DetailRow label="Destino:">{destLabel}</DetailRow>}
          </div>
        </div>
      </div>

      {/* ── 4. Goods description ── */}
      <div className="border-b border-slate-200 py-4">
        <SectionLabel>Descripcion de bienes / Description of Goods</SectionLabel>
        {(wr.content_description ?? wr.description) && (
          <p className="mb-2 text-[11px] text-slate-700">
            {wr.content_description ?? wr.description}
          </p>
        )}
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
                  <th className="px-3 py-2 text-right">Pzs</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2 text-right">Peso Real (lb)</th>
                  <th className="px-3 py-2 text-right">Dim (in)</th>
                  <th className="px-3 py-2 text-right">Peso Cobrable (lb)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.map((pkg, i) => (
                  <tr key={pkg.id} className="text-slate-700">
                    <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-1.5 font-mono font-medium">{pkg.tracking_number}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{pkg.pieces_count}</td>
                    <td className="px-3 py-1.5">{pkg.package_type ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {pkg.actual_weight_lb ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {pkg.length_in && pkg.width_in && pkg.height_in
                        ? `${pkg.length_in} × ${pkg.width_in} × ${pkg.height_in}`
                        : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                      {pkg.billable_weight_lb ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-700">
                  <td colSpan={2} className="px-3 py-2">
                    {wr.total_packages ?? packages.length} paquete(s)
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right tabular-nums">
                    {wr.total_actual_weight_lb ?? "—"} lb
                  </td>
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
        {hasNoExceptions || wr.condition_flags.length === 0 ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 print:bg-emerald-50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sin novedad / No exceptions noted
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {wr.condition_flags.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700 print:bg-amber-50"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                {CONDITION_FLAG_LABELS_ES[f as ConditionFlag] ?? f} / {CONDITION_FLAG_LABELS_EN[f as ConditionFlag] ?? f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── 6. Notes ── */}
      {((wr.wr_notes && wr.wr_notes.length > 0) || wr.notes) && (
        <div className="border-b border-slate-200 py-3">
          <SectionLabel>Notas / Notes</SectionLabel>
          {wr.notes && <p className="text-[11px] text-slate-700">{wr.notes}</p>}
          {wr.wr_notes && wr.wr_notes.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {wr.wr_notes.map((note) => (
                <p key={note.id} className="text-[10px] text-slate-600">{note.content}</p>
              ))}
            </div>
          )}
        </div>
      )}

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
  );
}
