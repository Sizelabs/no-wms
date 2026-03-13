"use client";

import JsBarcode from "jsbarcode";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/* ── Copy designations per IATA standard ── */
const COPY_INFO: Record<number, { label: string; color: string; bgClass: string }> = {
  1: { label: "ORIGINAL 1 (FOR ISSUING CARRIER)", color: "#16a34a", bgClass: "bg-green-50" },
  2: { label: "ORIGINAL 2 (FOR CONSIGNEE)", color: "#db2777", bgClass: "bg-pink-50" },
  3: { label: "ORIGINAL 3 (FOR SHIPPER)", color: "#2563eb", bgClass: "bg-blue-50" },
};

const LB_TO_KG = 0.453592;
const INTL_DIM_FACTOR = 166;

/* ── Types ── */

interface HawbCourier {
  name: string;
  code: string;
  ruc: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
}

interface HawbShipment {
  id: string;
  shipment_number: string;
  modality: string | null;
  status: string;
  carrier_name: string | null;
  flight_number: string | null;
  departure_date: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  awb_number: string | null;
}

interface HawbRecord {
  id: string;
  hawb_number: string;
  pieces: number | null;
  weight_lb: number | null;
  document_type: string;
  created_at: string;
  shipments: HawbShipment | HawbShipment[] | null;
}

interface WrPackage {
  tracking_number: string;
  carrier: string | null;
  package_type: string | null;
  pieces_count: number;
  actual_weight_lb: number | null;
  billable_weight_lb: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  is_dgr: boolean;
  dgr_class: string | null;
}

interface SiItem {
  warehouse_receipt_id: string;
  warehouse_receipts: {
    wr_number: string;
    total_actual_weight_lb: number | null;
    total_billable_weight_lb: number | null;
    total_packages: number | null;
    total_pieces: number | null;
    content_description: string | null;
    has_dgr_package: boolean;
    packages: WrPackage[] | null;
  } | null;
}

export interface HawbPrintDocumentProps {
  si: {
    id: string;
    si_number: string;
    status: string;
    special_instructions: string | null;
    additional_charges: Array<{ description: string; amount: number }> | null;
    total_pieces: number | null;
    total_billable_weight_lb: number | null;
    total_declared_value_usd: number | null;
    created_at: string;
    agencies: {
      id: string;
      name: string;
      code: string;
      type: string;
      courier_id: string | null;
      ruc: string | null;
      address: string | null;
      phone: string | null;
      email: string | null;
      couriers: HawbCourier | HawbCourier[] | null;
    } | null;
    consignees: {
      full_name: string;
      casillero: string | null;
      cedula_ruc: string | null;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      province: string | null;
      postal_code: string | null;
      phone: string | null;
      email: string | null;
    } | null;
    destinations: { id: string; city: string; country_code: string } | null;
    hawbs: HawbRecord[] | null;
    modalities: { id: string; name: string; code: string } | null;
    shipping_categories: { code: string; name: string } | null;
    warehouses: {
      name: string;
      code: string;
      city: string | null;
      country: string | null;
      full_address: string | null;
      phone: string | null;
      email: string | null;
    } | null;
    shipping_instruction_items: SiItem[] | null;
  };
  settings: Record<string, string>;
  org: { name: string; logo_url: string | null; slug: string | null } | null;
}

/* ── Helpers ── */

function lbToKg(lb: number | null): string {
  if (lb == null) return "0.00";
  return (lb * LB_TO_KG).toFixed(2);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function getCourier(agency: HawbPrintDocumentProps["si"]["agencies"]): HawbCourier | null {
  if (!agency?.couriers) return null;
  return Array.isArray(agency.couriers) ? agency.couriers[0] ?? null : agency.couriers;
}

function getShipment(hawb: HawbRecord): HawbShipment | null {
  if (!hawb.shipments) return null;
  return Array.isArray(hawb.shipments) ? hawb.shipments[0] ?? null : hawb.shipments;
}

/** Calculate volume weight in KG from package dimensions (inches) using dimensional factor */
function calcVolumeWeightKg(items: SiItem[]): number {
  let totalVolumeWeightKg = 0;
  for (const item of items) {
    for (const pkg of item.warehouse_receipts?.packages ?? []) {
      if (pkg.length_in != null && pkg.width_in != null && pkg.height_in != null) {
        totalVolumeWeightKg += (pkg.length_in * pkg.width_in * pkg.height_in) / INTL_DIM_FACTOR * LB_TO_KG;
      }
    }
  }
  return totalVolumeWeightKg;
}

/** Check if any WR in the items has dangerous goods */
function hasDangerousGoods(items: SiItem[]): boolean {
  for (const item of items) {
    const wr = item.warehouse_receipts;
    if (!wr) continue;
    if (wr.has_dgr_package) return true;
    for (const pkg of wr.packages ?? []) {
      if (pkg.is_dgr) return true;
    }
  }
  return false;
}

/** Collect DGR classes from packages */
function getDgrClasses(items: SiItem[]): string[] {
  const classes = new Set<string>();
  for (const item of items) {
    for (const pkg of item.warehouse_receipts?.packages ?? []) {
      if (pkg.is_dgr && pkg.dgr_class) classes.add(pkg.dgr_class);
    }
  }
  return Array.from(classes);
}

/** Build Nature of Goods description from WR items */
function buildGoodsDescription(items: SiItem[]): string {
  const descriptions: string[] = [];
  let totalPackages = 0;
  const packageTypes = new Set<string>();

  for (const item of items) {
    const wr = item.warehouse_receipts;
    if (!wr) continue;
    if (wr.content_description) descriptions.push(wr.content_description);
    totalPackages += wr.total_packages ?? wr.packages?.length ?? 0;
    for (const pkg of wr.packages ?? []) {
      if (pkg.package_type) packageTypes.add(pkg.package_type);
    }
  }

  const lines: string[] = [];
  lines.push("CONSOLIDATED CARGO AS PER ATTACHED MANIFEST");
  if (totalPackages > 0) {
    const typeStr = packageTypes.size > 0 ? Array.from(packageTypes).join(", ").toUpperCase() : "PACKAGES";
    lines.push(`${totalPackages} ${typeStr}`);
  }
  if (descriptions.length > 0) {
    lines.push(descriptions.join("; ").toUpperCase());
  }
  return lines.join("\n");
}

/* ── Reusable cell components ── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[7px] font-bold uppercase leading-tight tracking-wide text-navy-700">
      {children}
    </div>
  );
}

function FieldValue({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[9px] leading-snug text-black ${className}`}>
      {children}
    </div>
  );
}

/* ── Main component ── */

export function HawbPrintDocument({ si, settings, org }: HawbPrintDocumentProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const searchParams = useSearchParams();

  const copyNum = Math.min(3, Math.max(1, Number(searchParams.get("copy")) || 3));
  const copy = COPY_INFO[copyNum]!;

  const hawb = si.hawbs?.[0];
  if (!hawb) return <div className="p-8 text-red-600">No HAWB found for this SI.</div>;

  const courier = getCourier(si.agencies);
  const shipment = getShipment(hawb);
  const items = si.shipping_instruction_items ?? [];
  const additionalCharges = si.additional_charges ?? [];

  const grossWeightKg = Number(lbToKg(hawb.weight_lb));
  const volumeWeightKg = calcVolumeWeightKg(items);
  const chargeableWeightKg = Math.max(grossWeightKg, volumeWeightKg);

  const airportName = settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT";
  const goodsDescription = buildGoodsDescription(items);
  const isDgr = hasDangerousGoods(items);
  const dgrClasses = isDgr ? getDgrClasses(items) : [];

  const totalOtherCharges = additionalCharges.reduce((sum, c) => sum + (c.amount ?? 0), 0);

  // Shipper info — for HAWB: the customer/seller (agency)
  const shipperName = si.agencies?.name ?? "";
  const shipperAddress = si.agencies?.address ?? "";
  const shipperPhone = si.agencies?.phone ?? "";
  const shipperEmail = si.agencies?.email ?? "";
  const shipperRuc = si.agencies?.ruc ?? "";

  // Consignee info — for HAWB: the recipient/buyer
  const consignee = si.consignees;
  const consigneeName = consignee?.full_name ?? "";
  const consigneeAddress = [consignee?.address_line1, consignee?.address_line2, consignee?.city, consignee?.province, consignee?.postal_code].filter(Boolean).join(", ");
  const consigneeId = consignee?.cedula_ruc ?? "";
  const consigneePhone = consignee?.phone ?? "";
  const consigneeEmail = consignee?.email ?? "";
  const consigneeCasillero = consignee?.casillero ?? "";

  // Issuing Carrier's Agent — the freight forwarder (org/warehouse)
  const agentName = org?.name ?? "";
  const agentCity = si.warehouses?.city ?? "";

  // Routing info
  const destCity = si.destinations?.city?.toUpperCase() ?? "";
  const toAirport = shipment?.arrival_airport?.toUpperCase() || destCity;
  const carrierName = shipment?.carrier_name ?? courier?.name ?? "";
  const flightNumber = shipment?.flight_number ?? "";

  // MAWB reference for accounting info
  const mawbNumber = shipment?.awb_number ?? "";

  useEffect(() => {
    if (barcodeRef.current && hawb.hawb_number) {
      JsBarcode(barcodeRef.current, hawb.hawb_number, {
        format: "CODE128",
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 0,
      });
    }
  }, [hawb.hawb_number]);

  useEffect(() => {
    if (searchParams.get("auto") === "true") {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="hawb-document mx-auto max-w-[8.5in] bg-white text-black print:max-w-none print:p-0">
      {/* ── Screen toolbar ── */}
      <div className="mb-4 flex gap-2 print:hidden">
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

      {/* ── AWB Form ── */}
      <table className="w-full border-collapse border border-navy-800" style={{ borderColor: "#1e3a5f" }}>
        <tbody>
          {/* ═══ TOP ROW: HAWB number + barcode ═══ */}
          <tr>
            <td colSpan={4} className="awb-cell border-b p-2" style={{ borderColor: "#1e3a5f" }}>
              <div className="flex items-center justify-between">
                <div>
                  <svg ref={barcodeRef} />
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "#1e3a5f" }}>
                    House Air Waybill
                  </div>
                  <div className="font-mono text-lg font-bold tracking-tight" style={{ color: "#1e3a5f" }}>
                    {hawb.hawb_number}
                  </div>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW: Shipper (left) | Not Negotiable / Carrier info (right) ═══ */}
          <tr>
            {/* Box 1 + 2: Shipper (customer/seller for HAWB) */}
            <td colSpan={2} className="awb-cell w-1/2 border-b border-r align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Shipper&apos;s Name and Address</FieldLabel>
              <FieldValue className="mt-1 font-semibold">{shipperName}</FieldValue>
              {shipperAddress && <FieldValue>{shipperAddress}</FieldValue>}
              {shipperRuc && <FieldValue>RUC: {shipperRuc}</FieldValue>}
              {shipperPhone && <FieldValue>Tel: {shipperPhone}</FieldValue>}
              {shipperEmail && <FieldValue>{shipperEmail}</FieldValue>}
              {settings.hawb_shipper_account && (
                <div className="mt-1">
                  <FieldLabel>Shipper&apos;s Account Number</FieldLabel>
                  <FieldValue>{settings.hawb_shipper_account}</FieldValue>
                </div>
              )}
            </td>
            {/* Right: Not negotiable + carrier area */}
            <td colSpan={2} className="awb-cell w-1/2 border-b align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <div className="text-center text-[7px] font-bold uppercase tracking-wider" style={{ color: "#1e3a5f" }}>
                Not Negotiable
              </div>
              <div className="mt-1 text-center text-[7px] uppercase" style={{ color: "#1e3a5f" }}>
                Air Waybill
              </div>
              <div className="mt-2 text-center">
                <div className="text-[8px] font-bold uppercase">{carrierName}</div>
              </div>
              <div className="mt-2 text-[6px] leading-tight text-gray-500">
                Issued by the named carrier or its agent. It is agreed that the goods described herein are accepted in
                apparent good order and condition (except as noted) for carriage SUBJECT TO THE CONDITIONS OF
                CONTRACT ON THE REVERSE HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING
                ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN HEREON BY THE
                SHIPPER, AND SHIPPER AGREES THAT THE SHIPMENT MAY BE CARRIED VIA INTERMEDIATE STOPPING
                PLACES WHICH THE CARRIER DEEMS APPROPRIATE. THE SHIPPER&apos;S ATTENTION IS DRAWN TO THE NOTICE
                CONCERNING CARRIER&apos;S LIMITATION OF LIABILITY.
              </div>
            </td>
          </tr>

          {/* ═══ ROW: Consignee ═══ */}
          <tr>
            {/* Box 3 + 4: Consignee (recipient/buyer for HAWB) */}
            <td colSpan={2} className="awb-cell w-1/2 border-b border-r align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Consignee&apos;s Name and Address</FieldLabel>
              <FieldValue className="mt-1 font-semibold">{consigneeName}</FieldValue>
              {consigneeAddress && <FieldValue>{consigneeAddress}</FieldValue>}
              {consigneeId && <FieldValue>ID: {consigneeId}</FieldValue>}
              {consigneePhone && <FieldValue>Tel: {consigneePhone}</FieldValue>}
              {consigneeEmail && <FieldValue>{consigneeEmail}</FieldValue>}
              {consigneeCasillero && (
                <div className="mt-1">
                  <FieldLabel>Consignee&apos;s Account Number</FieldLabel>
                  <FieldValue>{consigneeCasillero}</FieldValue>
                </div>
              )}
            </td>
            {/* Box 5: Issuing Carrier's Agent (freight forwarder) */}
            <td colSpan={2} className="awb-cell w-1/2 border-b align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Issuing Carrier&apos;s Agent Name and City</FieldLabel>
              <FieldValue className="mt-1 font-semibold">{agentName}</FieldValue>
              <FieldValue>{agentCity}</FieldValue>
            </td>
          </tr>

          {/* ═══ ROW: Accounting Info | Agent IATA code + Account ═══ */}
          <tr>
            {/* Box 6: Accounting Information (HAWB: invoice, PO, MAWB number) */}
            <td colSpan={2} className="awb-cell w-1/2 border-b border-r align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Accounting Information</FieldLabel>
              <FieldValue className="mt-1">
                {mawbNumber ? `MAWB: ${mawbNumber}` : "\u00A0"}
              </FieldValue>
              <FieldValue>
                {si.si_number ? `REF: ${si.si_number}` : ""}
              </FieldValue>
            </td>
            {/* Box 7 + 8: Agent IATA Code + Account No. */}
            <td className="awb-cell border-b border-r align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Agent&apos;s IATA Code</FieldLabel>
              <FieldValue className="mt-1">{settings.hawb_iata_code || ""}</FieldValue>
            </td>
            <td className="awb-cell border-b align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Account No.</FieldLabel>
              <FieldValue className="mt-1">{settings.hawb_account_no || ""}</FieldValue>
            </td>
          </tr>

          {/* ═══ ROW: Airport of Departure ═══ */}
          <tr>
            <td colSpan={4} className="awb-cell border-b p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Airport of Departure (Addr. of First Carrier) and Requested Routing</FieldLabel>
              <FieldValue className="mt-1 font-semibold">{airportName}</FieldValue>
            </td>
          </tr>

          {/* ═══ ROW: Routing ═══ */}
          <tr>
            {/* Box 10: To (IATA airport code or city of first transfer point) */}
            <td className="awb-cell border-b border-r align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>To</FieldLabel>
              <FieldValue className="mt-1 font-semibold">{toAirport}</FieldValue>
            </td>
            <td className="awb-cell border-b border-r align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>By First Carrier</FieldLabel>
              <FieldValue className="mt-1">{carrierName}</FieldValue>
            </td>
            {/* Box 14: Airport of Destination */}
            <td className="awb-cell border-b border-r align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Airport of Destination</FieldLabel>
              <FieldValue className="mt-1 font-semibold">{destCity}</FieldValue>
            </td>
            {/* Box 15: Flight/Date */}
            <td className="awb-cell border-b align-top p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Flight/Date</FieldLabel>
              <FieldValue className="mt-1">
                {flightNumber}{shipment?.departure_date ? ` / ${formatDate(shipment.departure_date)}` : ""}
              </FieldValue>
            </td>
          </tr>

          {/* ═══ ROW: Currency / Charges ═══ */}
          <tr>
            <td className="awb-cell border-b border-r p-1.5 text-center" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Currency</FieldLabel>
              <FieldValue className="mt-0.5 font-semibold">USD</FieldValue>
            </td>
            <td className="awb-cell border-b border-r p-1.5 text-center" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>CHGS Code</FieldLabel>
              <FieldValue className="mt-0.5">PP</FieldValue>
            </td>
            <td className="awb-cell border-b border-r p-1.5" style={{ borderColor: "#1e3a5f" }}>
              <div className="flex justify-around text-center">
                <div>
                  <FieldLabel>WT/VAL</FieldLabel>
                  <div className="flex gap-3 mt-0.5">
                    <div>
                      <FieldLabel>PPD</FieldLabel>
                      <FieldValue className="mt-0.5 font-bold">X</FieldValue>
                    </div>
                    <div>
                      <FieldLabel>COLL</FieldLabel>
                      <FieldValue className="mt-0.5">&nbsp;</FieldValue>
                    </div>
                  </div>
                </div>
                <div>
                  <FieldLabel>Other</FieldLabel>
                  <div className="flex gap-3 mt-0.5">
                    <div>
                      <FieldLabel>PPD</FieldLabel>
                      <FieldValue className="mt-0.5 font-bold">X</FieldValue>
                    </div>
                    <div>
                      <FieldLabel>COLL</FieldLabel>
                      <FieldValue className="mt-0.5">&nbsp;</FieldValue>
                    </div>
                  </div>
                </div>
              </div>
            </td>
            <td className="awb-cell border-b p-1.5" style={{ borderColor: "#1e3a5f" }}>
              <div className="flex justify-around text-center">
                <div>
                  <FieldLabel>Declared Value for Carriage</FieldLabel>
                  <FieldValue className="mt-0.5 font-semibold">
                    {si.total_declared_value_usd != null ? si.total_declared_value_usd.toFixed(2) : "N.V.D."}
                  </FieldValue>
                </div>
                <div>
                  <FieldLabel>Declared Value for Customs</FieldLabel>
                  <FieldValue className="mt-0.5 font-semibold">
                    {si.total_declared_value_usd != null ? si.total_declared_value_usd.toFixed(2) : "N.C.V."}
                  </FieldValue>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW: Handling Information ═══ */}
          <tr>
            <td colSpan={4} className="awb-cell border-b p-2" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Handling Information / SCI</FieldLabel>
              <FieldValue className="mt-1">
                {si.special_instructions || ""}
              </FieldValue>
            </td>
          </tr>

          {/* ═══ ROW: Rate Description header ═══ */}
          <tr style={{ backgroundColor: "#eef2f7" }}>
            <td className="awb-cell border-b border-r p-1.5 text-center" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>No. of Pieces RCP</FieldLabel>
            </td>
            <td className="awb-cell border-b border-r p-1.5 text-center" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Gross Weight</FieldLabel>
              <div className="text-[6px] uppercase text-gray-500">KG</div>
            </td>
            <td className="awb-cell border-b border-r p-1.5 text-center" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Rate Class</FieldLabel>
            </td>
            <td className="awb-cell border-b p-1.5 text-center" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Chargeable Weight</FieldLabel>
            </td>
          </tr>

          {/* ═══ ROW: Rate Description data ═══ */}
          <tr>
            <td className="awb-cell border-b border-r p-2 text-center align-top" style={{ borderColor: "#1e3a5f" }}>
              <FieldValue className="font-mono font-semibold">{hawb.pieces ?? 0}</FieldValue>
            </td>
            <td className="awb-cell border-b border-r p-2 text-center align-top" style={{ borderColor: "#1e3a5f" }}>
              <FieldValue className="font-mono font-semibold">{grossWeightKg.toFixed(2)}</FieldValue>
            </td>
            <td className="awb-cell border-b border-r p-2 text-center align-top" style={{ borderColor: "#1e3a5f" }}>
              <FieldValue>G.C.</FieldValue>
            </td>
            <td className="awb-cell border-b p-2 text-center align-top" style={{ borderColor: "#1e3a5f" }}>
              <FieldValue className="font-mono font-semibold">{chargeableWeightKg.toFixed(2)}</FieldValue>
            </td>
          </tr>

          {/* ═══ ROW: Nature and Quantity of Goods ═══ */}
          <tr>
            <td colSpan={4} className="awb-cell border-b p-2" style={{ borderColor: "#1e3a5f", minHeight: "100px" }}>
              <FieldLabel>Nature and Quantity of Goods (incl. Dimensions or Volume)</FieldLabel>
              <FieldValue className="mt-1 whitespace-pre-line font-mono">{goodsDescription}</FieldValue>
              <div className="mt-3 text-[6px] uppercase text-gray-400">
                {isDgr
                  ? `DANGEROUS GOODS AS PER ATTACHED SHIPPER\u2019S DECLARATION${dgrClasses.length > 0 ? ` — CLASS ${dgrClasses.join(", ")}` : ""}`
                  : "NO DANGEROUS GOODS AS PER ATTACHED SHIPPER\u2019S DECLARATION"}
              </div>
            </td>
          </tr>

          {/* ═══ ROW: Other Charges ═══ */}
          {additionalCharges.length > 0 && (
            <tr>
              <td colSpan={4} className="awb-cell border-b p-2" style={{ borderColor: "#1e3a5f" }}>
                <FieldLabel>Other Charges</FieldLabel>
                <table className="mt-1 w-full text-[8px]">
                  <tbody>
                    {additionalCharges.map((charge, i) => (
                      <tr key={i}>
                        <td className="py-0.5 pr-4 uppercase">{charge.description}</td>
                        <td className="py-0.5 text-right font-mono">{charge.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-semibold" style={{ borderColor: "#1e3a5f" }}>
                      <td className="py-0.5 pr-4">TOTAL OTHER CHARGES DUE AGENT</td>
                      <td className="py-0.5 text-right font-mono">{totalOtherCharges.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          )}

          {/* ═══ ROW: Prepaid / Collect totals ═══ */}
          <tr style={{ backgroundColor: "#eef2f7" }}>
            <td colSpan={2} className="awb-cell border-b border-r p-2 text-center" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Total Prepaid</FieldLabel>
              <FieldValue className="mt-0.5 font-mono font-semibold">
                {totalOtherCharges > 0 ? totalOtherCharges.toFixed(2) : ""}
              </FieldValue>
            </td>
            <td colSpan={2} className="awb-cell border-b p-2 text-center" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Total Collect</FieldLabel>
              <FieldValue className="mt-0.5">&nbsp;</FieldValue>
            </td>
          </tr>

          {/* ═══ ROW: Shipper signature + Executed on ═══ */}
          <tr>
            <td colSpan={2} className="awb-cell border-b border-r p-2 align-top" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Signature of Shipper or his Agent</FieldLabel>
              <FieldValue className="mt-3 font-semibold">{agentName}</FieldValue>
              <FieldValue className="text-[7px] italic text-gray-500">Authorized agent for shipper</FieldValue>
            </td>
            <td colSpan={2} className="awb-cell border-b p-2 align-top" style={{ borderColor: "#1e3a5f" }}>
              <FieldLabel>Executed on (Date)</FieldLabel>
              <FieldValue className="mt-1">{formatDate(hawb.created_at)}</FieldValue>
              <FieldLabel>at (Place)</FieldLabel>
              <FieldValue>{airportName}</FieldValue>
              <FieldLabel>Signature of Issuing Carrier or its Agent</FieldLabel>
              <FieldValue className="mt-2 font-semibold">{agentName}</FieldValue>
            </td>
          </tr>

          {/* ═══ ROW: Copy designation ═══ */}
          <tr>
            <td
              colSpan={4}
              className={`p-2 text-center ${copy.bgClass}`}
              style={{ borderColor: "#1e3a5f", color: copy.color }}
            >
              <div className="text-[9px] font-bold uppercase tracking-widest">
                {copy.label}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
