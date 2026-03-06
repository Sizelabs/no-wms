"use client";

import type { ConditionFlag } from "@no-wms/shared/constants/condition-flags";
import {
  CONDITION_FLAG_LABELS_EN,
  CONDITION_FLAG_LABELS_ES,
} from "@no-wms/shared/constants/condition-flags";
import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

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

export function WrPrintDocument({ wr, settings, destination, org }: WrPrintDocumentProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, wr.wr_number, {
        format: "CODE128",
        width: 1.5,
        height: 40,
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

  const hasConditionFlags = wr.condition_flags.length > 0;
  const hasNoExceptions = wr.condition_flags.includes("sin_novedad");

  return (
    <div className="mx-auto max-w-[7.5in] bg-white text-black">
      {/* Print trigger button — hidden in print */}
      <div className="mb-4 flex gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Imprimir
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>

      {/* ── 1. Header ── */}
      <div className="border-b-2 border-black pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {org?.logo_url && (
              <img src={org.logo_url} alt="" className="h-10 w-10 object-contain" />
            )}
            <div>
              <p className="text-[12pt] font-bold">{org?.name ?? "Warehouse"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[14pt] font-bold tracking-wide">{wr.wr_number}</p>
            <p className="text-[8pt] uppercase text-gray-600">
              {WR_STATUS_LABELS[wr.status as WrStatus] ?? wr.status}
            </p>
          </div>
        </div>
        <div className="mt-1 text-center">
          <p className="text-[11pt] font-bold uppercase tracking-wider">
            Recibo de Bodega / Warehouse Receipt
          </p>
          <p className="text-[8pt] font-semibold uppercase text-red-700">
            No Negociable / Nonnegotiable
          </p>
        </div>
      </div>

      {/* ── 2. Warehouse info ── */}
      <div className="grid grid-cols-2 gap-x-4 border-b py-1.5 text-[9pt]">
        <div>
          <p className="font-semibold">{wr.warehouses?.name ?? "—"} ({wr.warehouses?.code})</p>
          {wr.warehouses?.full_address && <p>{wr.warehouses.full_address}</p>}
          {wr.warehouses?.phone && <p>Tel: {wr.warehouses.phone}</p>}
          {wr.warehouses?.email && <p>Email: {wr.warehouses.email}</p>}
        </div>
        <div className="text-right">
          <p><span className="font-semibold">Fecha / Date:</span> {new Date(wr.received_at).toLocaleDateString("es", { year: "numeric", month: "2-digit", day: "2-digit" })}</p>
          <p><span className="font-semibold">Recibido por / Received by:</span> {wr.profiles?.full_name ?? "—"}</p>
          {wr.warehouse_locations && (
            <p><span className="font-semibold">Ubicacion:</span> {zoneName ? `${zoneName} / ` : ""}{wr.warehouse_locations.code}</p>
          )}
        </div>
      </div>

      {/* ── 3. Parties ── */}
      <div className="grid grid-cols-2 gap-x-4 border-b py-1.5 text-[9pt]">
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-500">Depositante / Depositor</p>
          <p className="font-semibold">{wr.agencies ? `${wr.agencies.name} (${wr.agencies.code})` : "Desconocido"}</p>
          {courierName && <p>Courier: {courierName}</p>}
          {wr.shipper_name && <p>Shipper: {wr.shipper_name}</p>}
          {wr.master_tracking && <p>Master: {wr.master_tracking}</p>}
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-500">Consignatario / Consignee</p>
          <p className="font-semibold">{wr.consignees?.full_name ?? wr.consignee_name ?? "Sin asignar"}</p>
          {wr.consignees?.casillero && <p>Casillero: {wr.consignees.casillero}</p>}
          {destLabel && <p>Destino: {destLabel}</p>}
        </div>
      </div>

      {/* ── 4. Goods description ── */}
      <div className="border-b py-1.5">
        <p className="text-[8pt] font-semibold uppercase text-gray-500">
          Descripcion de bienes / Description of Goods
        </p>
        <p className="mb-1 text-[8pt] italic text-gray-600">
          Received in apparent good order, except as noted. Contents, condition, and quality unknown.
        </p>
        {(wr.content_description ?? wr.description) && (
          <p className="mb-1 text-[9pt]">{wr.content_description ?? wr.description}</p>
        )}

        {packages.length > 0 && (
          <table className="mt-1 w-full text-[8pt]">
            <thead>
              <tr className="border-y border-gray-400 text-left">
                <th className="py-0.5 font-semibold">#</th>
                <th className="py-0.5 font-semibold">Tracking / Guia</th>
                <th className="py-0.5 font-semibold">Carrier</th>
                <th className="py-0.5 text-right font-semibold">Peso / Weight (lb)</th>
                <th className="py-0.5 text-right font-semibold">Dim (in)</th>
                <th className="py-0.5 font-semibold">Tipo / Type</th>
                <th className="py-0.5 text-right font-semibold">Pzs</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, i) => (
                <tr key={pkg.id} className="border-b border-gray-200">
                  <td className="py-0.5">{i + 1}</td>
                  <td className="py-0.5 font-mono">{pkg.tracking_number}</td>
                  <td className="py-0.5">{pkg.carrier ?? "—"}</td>
                  <td className="py-0.5 text-right">{pkg.actual_weight_lb ?? "—"}</td>
                  <td className="py-0.5 text-right">
                    {pkg.length_in && pkg.width_in && pkg.height_in
                      ? `${pkg.length_in}x${pkg.width_in}x${pkg.height_in}`
                      : "—"}
                  </td>
                  <td className="py-0.5">{pkg.package_type ?? "—"}</td>
                  <td className="py-0.5 text-right">{pkg.pieces_count}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-400 font-semibold">
                <td colSpan={3} className="py-0.5">Total: {wr.total_packages ?? packages.length} paquete(s)</td>
                <td className="py-0.5 text-right">{wr.total_actual_weight_lb ?? "—"} lb</td>
                <td colSpan={2} className="py-0.5"></td>
                <td className="py-0.5 text-right">
                  {wr.total_declared_value_usd != null ? `$${Number(wr.total_declared_value_usd).toFixed(2)}` : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── 5. Condition ── */}
      <div className="border-b py-1 text-[9pt]">
        <p className="text-[8pt] font-semibold uppercase text-gray-500">
          Condicion de ingreso / Condition on Arrival
        </p>
        {hasConditionFlags ? (
          <p>
            {hasNoExceptions
              ? "Sin novedad / No exceptions noted."
              : wr.condition_flags
                  .map((f) => `${CONDITION_FLAG_LABELS_ES[f as ConditionFlag] ?? f} / ${CONDITION_FLAG_LABELS_EN[f as ConditionFlag] ?? f}`)
                  .join("; ")}
          </p>
        ) : (
          <p>No exceptions noted.</p>
        )}
      </div>

      {/* ── 6. Notes ── */}
      {wr.wr_notes && wr.wr_notes.length > 0 && (
        <div className="border-b py-1 text-[9pt]">
          <p className="text-[8pt] font-semibold uppercase text-gray-500">Notas / Notes</p>
          {wr.wr_notes.map((note) => (
            <p key={note.id}>{note.content}</p>
          ))}
        </div>
      )}

      {/* ── 7. Legal block ── */}
      <div className="border-b py-1.5 text-[8pt] leading-tight text-gray-700">
        <p className="text-[7pt] font-semibold uppercase text-gray-500">Terminos y condiciones / Terms & Conditions</p>
        <div className="mt-0.5 space-y-0.5">
          {settings.wr_storage_charges_text && (
            <p><span className="font-semibold">Storage / Almacenaje:</span> {settings.wr_storage_charges_text}</p>
          )}
          {settings.wr_lien_statement && (
            <p><span className="font-semibold">Advances & Liens:</span> {settings.wr_lien_statement}</p>
          )}
          {settings.wr_ownership_statement && (
            <p><span className="font-semibold">Ownership:</span> {settings.wr_ownership_statement}</p>
          )}
          {settings.wr_liability_per_pound && (
            <p><span className="font-semibold">Liability / Responsabilidad:</span> Liability limited to ${settings.wr_liability_per_pound} per pound per article unless declared value is stated and additional charges paid.</p>
          )}
          {settings.wr_delivery_statement && (
            <p><span className="font-semibold">Delivery / Entrega:</span> {settings.wr_delivery_statement}</p>
          )}
          {settings.wr_terms_url && (
            <p><span className="font-semibold">Full T&C:</span> {settings.wr_terms_url}</p>
          )}
        </div>
      </div>

      {/* ── 8. Signatures ── */}
      <div className="grid grid-cols-2 gap-8 py-4 text-[9pt]">
        <div>
          <div className="mb-1 border-b border-black" style={{ height: "2rem" }} />
          <p className="font-semibold">Firma del Almacen / Warehouse Signature</p>
          <p className="text-[8pt] text-gray-500">Fecha / Date: ____________</p>
        </div>
        <div>
          <div className="mb-1 border-b border-black" style={{ height: "2rem" }} />
          <p className="font-semibold">Firma del Depositante / Depositor Signature</p>
          <p className="text-[8pt] text-gray-500">Fecha / Date: ____________</p>
        </div>
      </div>

      {/* ── 9. Footer ── */}
      <div className="flex items-end justify-between border-t pt-1.5 text-[7pt] text-gray-500">
        <div>
          <svg ref={barcodeRef} />
          <p className="mt-0.5 font-mono">{wr.wr_number}</p>
        </div>
        <div className="text-right">
          <p>Ref: UCC Article 7, FL Stat. Ch. 677</p>
          <p>Generated: {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC</p>
        </div>
      </div>
    </div>
  );
}
