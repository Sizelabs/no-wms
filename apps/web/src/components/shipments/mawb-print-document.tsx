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

interface HawbSiAgency {
  name: string;
  code: string;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface HawbSiConsignee {
  full_name: string;
  casillero: string | null;
  cedula_ruc: string | null;
  address_line1: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
}

interface WrPackage {
  tracking_number: string;
  package_type: string | null;
  pieces_count: number;
  actual_weight_lb: number | null;
  billable_weight_lb: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  is_dgr: boolean;
  dgr_class: string | null;
  content_description: string | null;
}

interface SiItem {
  warehouse_receipt_id: string;
  warehouse_receipts: {
    wr_number: string;
    total_actual_weight_lb: number | null;
    total_billable_weight_lb: number | null;
    total_packages: number | null;
    total_pieces: number | null;
    has_dgr_package: boolean;
    packages: WrPackage[] | null;
  } | null;
}

interface HawbSi {
  si_number: string;
  agency_id: string;
  total_pieces: number | null;
  total_billable_weight_lb: number | null;
  total_declared_value_usd: number | null;
  special_instructions: string | null;
  additional_charges: Array<{ description: string; amount: number }> | null;
  agencies: HawbSiAgency | HawbSiAgency[] | null;
  consignees: HawbSiConsignee | HawbSiConsignee[] | null;
  shipping_instruction_items: SiItem[] | null;
}

interface MawbHawb {
  id: string;
  hawb_number: string;
  document_type: string;
  pieces: number | null;
  weight_lb: number | null;
  created_at: string;
  shipping_instructions: HawbSi | HawbSi[] | null;
}

export interface MawbPrintDocumentProps {
  shipment: {
    id: string;
    shipment_number: string;
    modality: string;
    status: string;
    awb_number: string | null;
    booking_number: string | null;
    flight_number: string | null;
    departure_airport: string | null;
    arrival_airport: string | null;
    departure_date: string | null;
    arrival_date: string | null;
    shipper_name: string | null;
    shipper_address: string | null;
    consignee_name: string | null;
    consignee_address: string | null;
    total_pieces: number | null;
    total_weight_lb: number | null;
    notes: string | null;
    created_at: string;
    carriers: { name: string; code: string } | { name: string; code: string }[] | null;
    destinations: { city: string; country_code: string } | { city: string; country_code: string }[] | null;
    agencies: { name: string; code: string; address: string | null; phone: string | null; email: string | null } | null;
    warehouses: { name: string; code: string; city: string | null; country: string | null; full_address: string | null; phone: string | null; email: string | null } | null;
    hawbs: MawbHawb[] | null;
  };
  settings: Record<string, string>;
  org: { name: string; logo_url: string | null; slug: string | null } | null;
}

/* ── Helpers ── */

function lbToKg(lb: number | null): number {
  if (lb == null) return 0;
  return lb * LB_TO_KG;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function unwrap<T>(val: T | T[] | null): T | null {
  if (val == null) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

function collectAllItems(hawbs: MawbHawb[]): SiItem[] {
  const items: SiItem[] = [];
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions);
    if (!si) continue;
    for (const item of si.shipping_instruction_items ?? []) {
      items.push(item);
    }
  }
  return items;
}

function calcTotalPieces(hawbs: MawbHawb[]): number {
  let total = 0;
  for (const h of hawbs) total += h.pieces ?? 0;
  return total;
}

function calcTotalWeightLb(hawbs: MawbHawb[]): number {
  let total = 0;
  for (const h of hawbs) total += h.weight_lb ?? 0;
  return total;
}

function calcVolumeWeightKg(items: SiItem[]): number {
  let total = 0;
  for (const item of items) {
    for (const pkg of item.warehouse_receipts?.packages ?? []) {
      if (pkg.length_in != null && pkg.width_in != null && pkg.height_in != null) {
        total += (pkg.length_in * pkg.width_in * pkg.height_in) / INTL_DIM_FACTOR * LB_TO_KG;
      }
    }
  }
  return total;
}

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

function getDgrClasses(items: SiItem[]): string[] {
  const classes = new Set<string>();
  for (const item of items) {
    for (const pkg of item.warehouse_receipts?.packages ?? []) {
      if (pkg.is_dgr && pkg.dgr_class) classes.add(pkg.dgr_class);
    }
  }
  return Array.from(classes);
}

function buildGoodsDescription(hawbs: MawbHawb[]): string {
  const lines: string[] = [];
  lines.push("CONSOLIDATED CARGO AS PER ATTACHED MANIFEST");
  let totalPackages = 0;
  const packageTypes = new Set<string>();
  const descriptions: string[] = [];
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions);
    if (!si) continue;
    for (const item of si.shipping_instruction_items ?? []) {
      const wr = item.warehouse_receipts;
      if (!wr) continue;
      totalPackages += wr.total_packages ?? wr.packages?.length ?? 0;
      for (const pkg of wr.packages ?? []) {
        if (pkg.content_description) descriptions.push(pkg.content_description);
        if (pkg.package_type) packageTypes.add(pkg.package_type);
      }
    }
  }
  if (totalPackages > 0) {
    const typeStr = packageTypes.size > 0 ? Array.from(packageTypes).join(", ").toUpperCase() : "PACKAGES";
    lines.push(`${totalPackages} ${typeStr}`);
  }
  if (descriptions.length > 0) {
    lines.push([...new Set(descriptions)].join("; ").toUpperCase());
  }
  return lines.join("\n");
}

function calcTotalDeclaredValue(hawbs: MawbHawb[]): number | null {
  let hasValue = false;
  let total = 0;
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions);
    if (si?.total_declared_value_usd != null) {
      hasValue = true;
      total += si.total_declared_value_usd;
    }
  }
  return hasValue ? total : null;
}

/* ── Reusable ── */

function L({ children }: { children: React.ReactNode }) {
  return <div className="text-[6.5px] leading-tight tracking-wide text-black">{children}</div>;
}

function V({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-[9px] leading-snug text-black ${className}`}>{children}</div>;
}

/* ── Border shorthand ── */
const B = "#999";
const bs = `1px solid ${B}`;

/* ── Main component ── */

export function MawbPrintDocument({ shipment, settings, org }: MawbPrintDocumentProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const searchParams = useSearchParams();

  const copyNum = Math.min(3, Math.max(1, Number(searchParams.get("copy")) || 3));
  const copy = COPY_INFO[copyNum]!;

  const carrier = unwrap(shipment.carriers);
  const destination = unwrap(shipment.destinations);
  const hawbs = shipment.hawbs ?? [];
  const allItems = collectAllItems(hawbs);

  const totalPieces = shipment.total_pieces ?? calcTotalPieces(hawbs);
  const totalWeightLb = shipment.total_weight_lb ?? calcTotalWeightLb(hawbs);
  const grossWeightKg = lbToKg(totalWeightLb);
  const volumeWeightKg = calcVolumeWeightKg(allItems);
  const chargeableWeightKg = Math.max(grossWeightKg, volumeWeightKg);

  const airportName = settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT";
  const goodsDescription = buildGoodsDescription(hawbs);
  const isDgr = hasDangerousGoods(allItems);
  const dgrClasses = isDgr ? getDgrClasses(allItems) : [];
  const totalDeclaredValue = calcTotalDeclaredValue(hawbs);
  const awbNumber = shipment.awb_number ?? "";

  const shipperName = shipment.shipper_name || org?.name || "";
  const shipperAddress = shipment.shipper_address || shipment.warehouses?.full_address || "";
  const consigneeName = shipment.consignee_name || shipment.agencies?.name || "";
  const consigneeAddress = shipment.consignee_address || shipment.agencies?.address || "";
  const agentName = org?.name ?? "";
  const agentCity = shipment.warehouses?.city ?? "";
  const toAirport = shipment.arrival_airport?.toUpperCase() || destination?.city?.toUpperCase() || "";
  const carrierName = carrier?.name ?? "";
  const flightNumber = shipment.flight_number ?? "";

  useEffect(() => {
    if (barcodeRef.current && awbNumber) {
      JsBarcode(barcodeRef.current, awbNumber.replace(/-/g, ""), {
        format: "CODE128",
        width: 1.5,
        height: 36,
        displayValue: false,
        margin: 0,
      });
    }
  }, [awbNumber]);

  useEffect(() => {
    if (searchParams.get("auto") === "true") {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div
      className="mawb-document mx-auto max-w-[8.5in] bg-white text-black print:max-w-none print:m-0 print:p-0"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
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

      {/* ══════════════════════════════════════════════════════════
          IATA STANDARD AIR WAYBILL — Faithful reproduction
          ══════════════════════════════════════════════════════════ */}
      <table
        className="w-full border-collapse text-black"
        style={{ border: bs }}
        cellPadding={0}
        cellSpacing={0}
      >
        {/* Column widths: left ~50%, right ~50% */}
        <colgroup>
          <col style={{ width: "50%" }} />
          <col style={{ width: "50%" }} />
        </colgroup>

        <tbody>
          {/* ═══ ROW 1: Shipper (left, rowSpan=2) | Not Negotiable + AWB (right) ═══ */}
          <tr>
            <td
              rowSpan={2}
              style={{ borderRight: bs, borderBottom: bs, padding: "4px 6px", verticalAlign: "top" }}
            >
              <L>Shipper&apos;s Name and Address</L>
              <V className="mt-1.5 font-semibold">{shipperName}</V>
              {shipperAddress && <V>{shipperAddress}</V>}
              {shipment.warehouses?.phone && <V>Tel: {shipment.warehouses.phone}</V>}
            </td>
            <td style={{ borderBottom: bs, padding: "4px 6px", verticalAlign: "top" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[8px] leading-tight">Not Negotiable</div>
                  <div className="text-[8px] leading-tight">Air Waybill</div>
                  <div className="text-[8px] mt-0.5">Issued By</div>
                  <div className="text-[9px] font-bold mt-0.5">{carrierName}</div>
                </div>
                <div className="text-right">
                  <svg ref={barcodeRef} />
                  <div className="font-mono text-[13px] font-bold tracking-wide mt-0.5">
                    {awbNumber}
                  </div>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 2: [Shipper continues] | Copies + legal validity text ═══ */}
          <tr>
            <td style={{ borderBottom: bs, padding: "3px 6px", verticalAlign: "top" }}>
              <div className="text-[7px] leading-tight">
                Copies 1, 2 and 3 of this Air Waybill are originals and have the same validity
              </div>
            </td>
          </tr>

          {/* ═══ ROW 3: Consignee (left) | Legal text (right) ═══ */}
          <tr>
            <td style={{ borderRight: bs, borderBottom: bs, padding: "4px 6px", verticalAlign: "top" }}>
              <L>Consignee&apos;s Name and Address</L>
              <V className="mt-1.5 font-semibold">{consigneeName}</V>
              {consigneeAddress && <V>{consigneeAddress}</V>}
              {shipment.agencies?.phone && <V>Tel: {shipment.agencies.phone}</V>}
            </td>
            <td style={{ borderBottom: bs, padding: "4px 6px", verticalAlign: "top" }}>
              <div className="text-[6.5px] leading-[1.4]" style={{ textAlign: "justify" }}>
                It is agreed that the goods described herein are accepted in apparent good order and condition
                (except as noted) for carriage SUBJECT TO THE CONDITIONS OF CONTRACT ON THE
                REVERSE HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING
                ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN
                HEREON BY THE SHIPPER, AND SHIPPER AGREES THAT THE SHIPMENT MAY BE CARRIED
                VIA INTERMEDIATE STOPPING PALCES WHICH THE CARRIER DEEMS APPROPRIATE THE
                SHIPER&apos;S ATTENTION IS DRAWN TO THE NOTICE CONCERNING CARRIER&apos;S LIMITATION OF
                LIABILITY. Shipper may increase such limitation of liability by declaring a higher value for carriage
                and paying a supplemental charge if required.
              </div>
            </td>
          </tr>

          {/* ═══ ROW 4: Issuing Carrier's Agent (left) | Accounting Information (right, rowSpan=2) ═══ */}
          <tr>
            <td style={{ borderRight: bs, borderBottom: bs, padding: "4px 6px", verticalAlign: "top" }}>
              <L>Issuing Carrier&apos;s Agent Name and City</L>
              <V className="mt-1 font-semibold">{agentName}</V>
              <V>{agentCity}</V>
            </td>
            <td
              rowSpan={2}
              style={{ borderBottom: bs, padding: "4px 6px", verticalAlign: "top" }}
            >
              <L>Accounting Information:</L>
              <V className="mt-1">
                {hawbs.length > 0 && hawbs.map((h) => h.hawb_number).join(", ")}
              </V>
            </td>
          </tr>

          {/* ═══ ROW 5: Agent's IATA Code | Account No. (left) | [Accounting continues right] ═══ */}
          <tr>
            <td style={{ borderRight: bs, borderBottom: bs, padding: 0, verticalAlign: "top" }}>
              <div className="flex">
                <div style={{ width: "55%", padding: "4px 6px", borderRight: bs }}>
                  <L>Agent&apos;s AITA Code</L>
                  <V className="mt-1">{settings.hawb_iata_code || ""}</V>
                </div>
                <div style={{ width: "45%", padding: "4px 6px" }}>
                  <L>Account No.</L>
                  <V className="mt-1">{settings.hawb_account_no || ""}</V>
                </div>
              </div>
            </td>
            {/* Accounting Info td continues from rowSpan above */}
          </tr>

          {/* ═══ ROW 6: Airport of Departure (left) | Reference Number | Optional Shipping Info (right) ═══ */}
          <tr>
            <td style={{ borderRight: bs, borderBottom: bs, padding: "4px 6px", verticalAlign: "top" }}>
              <L>Airport of Departure (Addr. of First Carrier) and Requested Routing</L>
              <V className="mt-1 font-semibold">{airportName}</V>
            </td>
            <td style={{ borderBottom: bs, padding: 0, verticalAlign: "top" }}>
              <div className="flex">
                <div style={{ width: "60%", padding: "4px 6px", borderRight: bs }}>
                  <L>Reference Number</L>
                  <V className="mt-1">{shipment.shipment_number}</V>
                </div>
                <div style={{ width: "40%", padding: "4px 6px" }}>
                  <L>Optional Shipping Information</L>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 7: Routing — To | By First Carrier | to | by | to | by (full width) ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "5%", padding: "3px 4px", borderRight: bs }}>
                  <L>To</L>
                  <V className="mt-0.5 font-semibold">{toAirport}</V>
                </div>
                <div style={{ width: "20%", padding: "3px 4px", borderRight: bs }}>
                  <L>By First Carrier</L>
                  <V className="mt-0.5">{carrierName}</V>
                </div>
                <div style={{ width: "5%", padding: "3px 4px", borderRight: bs }}>
                  <L>to</L>
                </div>
                <div style={{ width: "5%", padding: "3px 4px", borderRight: bs }}>
                  <L>by</L>
                </div>
                <div style={{ width: "5%", padding: "3px 4px", borderRight: bs }}>
                  <L>to</L>
                </div>
                <div style={{ width: "5%", padding: "3px 4px", borderRight: bs }}>
                  <L>by</L>
                </div>
                {/* Currency */}
                <div style={{ width: "5%", padding: "2px 3px", borderRight: bs }} className="text-center">
                  <L>Currency</L>
                  <V className="mt-0.5 font-semibold">USD</V>
                </div>
                {/* CHGS Code */}
                <div style={{ width: "4%", padding: "2px 2px", borderRight: bs }} className="text-center">
                  <L>CHGS</L>
                  <div className="text-[5px]">Code</div>
                  <V className="mt-0.5">PP</V>
                </div>
                {/* WT/VAL PPD COLL */}
                <div style={{ width: "7%", padding: "1px 2px", borderRight: bs }} className="text-center">
                  <L>WT/VAL</L>
                  <div className="flex justify-around text-[5px]">
                    <span>PPD</span><span>COLL</span>
                  </div>
                  <div className="flex justify-around mt-0.5">
                    <V className="font-bold">X</V><V>&nbsp;</V>
                  </div>
                </div>
                {/* Other PPD COLL */}
                <div style={{ width: "7%", padding: "1px 2px", borderRight: bs }} className="text-center">
                  <L>Other</L>
                  <div className="flex justify-around text-[5px]">
                    <span>PPD</span><span>COLL</span>
                  </div>
                  <div className="flex justify-around mt-0.5">
                    <V className="font-bold">X</V><V>&nbsp;</V>
                  </div>
                </div>
                {/* Declared Value for Carriage */}
                <div style={{ width: "16%", padding: "2px 3px", borderRight: bs }} className="text-center">
                  <L>Declared Value for Carriage</L>
                  <V className="mt-0.5 font-semibold">
                    {totalDeclaredValue != null ? totalDeclaredValue.toFixed(2) : "NVD"}
                  </V>
                </div>
                {/* Declared Value for Customs */}
                <div style={{ width: "16%", padding: "2px 3px" }} className="text-center">
                  <L>Declared Value for Customs</L>
                  <V className="mt-0.5 font-semibold">
                    {totalDeclaredValue != null ? totalDeclaredValue.toFixed(2) : "NCV"}
                  </V>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 8: Airport of Destination | Flight/Date | For Carrier Use Only | Flight Date | Amount of Insurance | Insurance text ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                {/* Aligns with To + By First Carrier above (5+20 = 25%) */}
                <div style={{ width: "25%", padding: "3px 4px", borderRight: bs }}>
                  <L>Airport of Destination</L>
                  <V className="mt-0.5 font-semibold">{toAirport}</V>
                </div>
                {/* Aligns with to+by above (5+5 = 10%) */}
                <div style={{ width: "10%", padding: "3px 4px", borderRight: bs }}>
                  <L>Flight Date</L>
                  <V className="mt-0.5">
                    {flightNumber}{shipment.departure_date ? ` / ${formatDate(shipment.departure_date)}` : ""}
                  </V>
                </div>
                {/* Aligns with to+by above (5+5 = 10%) */}
                <div style={{ width: "10%", padding: "3px 4px", borderRight: bs, borderLeft: `1px dotted ${B}`, borderTop: `1px dotted ${B}`, borderBottom: `1px dotted ${B}` }}>
                  <L>For Carrier Use Only</L>
                </div>
                {/* Aligns with Currency above (5%) */}
                <div style={{ width: "5%", padding: "3px 4px", borderRight: bs }}>
                  <L>Flight Date</L>
                </div>
                {/* Amount of Insurance — aligns with CHGS+WT/VAL (4+7 = 11%) */}
                <div style={{ width: "11%", padding: "3px 4px", borderRight: bs }}>
                  <L>Amount of Insurance</L>
                </div>
                {/* Insurance text — aligns with Other+DV Carriage+DV Customs (7+16+16 = 39%) */}
                <div style={{ width: "39%", padding: "3px 4px" }}>
                  <div className="text-[6px] leading-tight">
                    INSURANCE - If carrier offers insurance, and such insurance is requested
                    in accordance with the conditions thereof, indicate amount to be insured in
                    figures in box marked &quot;Amount of Insurance.&quot;
                  </div>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 9-10: Handling Information + SCI ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: "4px 6px", height: "50px", verticalAlign: "top" }}>
              <L>Handling Information</L>
              <V className="mt-0.5">{shipment.notes || "\u00A0"}</V>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex justify-end">
                <div style={{ flex: 1 }} />
                <div style={{ borderLeft: bs, padding: "2px 6px" }}>
                  <L>SCI</L>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 11: Rate Description Header ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex text-center">
                <div style={{ width: "6%", padding: "2px 2px", borderRight: bs }}>
                  <L>No. of</L>
                  <L>Pieces</L>
                  <L>RCP</L>
                </div>
                <div style={{ width: "8%", padding: "2px 2px", borderRight: bs }}>
                  <L>Gross Weight</L>
                  <div className="flex text-[5px] leading-tight">
                    <div className="flex-1 text-center" style={{ borderRight: bs }}>kg</div>
                    <div className="flex-1 text-center">lb</div>
                  </div>
                </div>
                <div style={{ width: "10%", padding: "2px 2px", borderRight: bs }}>
                  <L>Rate Class</L>
                  <div style={{ borderTop: bs, marginTop: "1px", paddingTop: "1px" }}>
                    <L>Commodity</L>
                    <L>Item No.</L>
                  </div>
                </div>
                <div style={{ width: "10%", padding: "2px 2px", borderRight: bs }}>
                  <L>Chargeable</L>
                  <L>Weight</L>
                </div>
                <div style={{ width: "8%", padding: "2px 2px", borderRight: bs }}>
                  <L>Rate / Charge</L>
                </div>
                <div style={{ width: "8%", padding: "2px 2px", borderRight: bs }}>
                  <L>Total</L>
                </div>
                <div style={{ width: "50%", padding: "2px 4px", textAlign: "left" }}>
                  <L>Nature and Quantity of Goods (inc. Dimensions or Volume)</L>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 12: Rate Description Data (tall area) ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0, height: "220px", verticalAlign: "top" }}>
              <div className="flex h-full">
                <div style={{ width: "6%", padding: "3px 2px", borderRight: bs }} className="text-center">
                  <V className="font-mono font-semibold">{totalPieces}</V>
                </div>
                <div style={{ width: "8%", padding: "3px 2px", borderRight: bs }} className="text-center">
                  <V className="font-mono font-semibold">{grossWeightKg.toFixed(1)}</V>
                </div>
                <div style={{ width: "10%", padding: "3px 2px", borderRight: bs }} className="text-center">
                  <V>Q</V>
                </div>
                <div style={{ width: "10%", padding: "3px 2px", borderRight: bs }} className="text-center">
                  <V className="font-mono font-semibold">{chargeableWeightKg.toFixed(1)}</V>
                </div>
                <div style={{ width: "8%", padding: "3px 2px", borderRight: bs }} className="text-center">
                  &nbsp;
                </div>
                <div style={{ width: "8%", padding: "3px 2px", borderRight: bs }} className="text-center">
                  &nbsp;
                </div>
                <div style={{ width: "50%", padding: "3px 4px" }}>
                  <V className="whitespace-pre-line font-mono">{goodsDescription}</V>
                  <div className="mt-2 text-[6px] uppercase text-gray-500">
                    {isDgr
                      ? `DANGEROUS GOODS AS PER ATTACHED SHIPPER\u2019S DECLARATION${dgrClasses.length > 0 ? ` \u2014 CLASS ${dgrClasses.join(", ")}` : ""}`
                      : "NO DANGEROUS GOODS AS PER ATTACHED SHIPPER\u2019S DECLARATION"}
                  </div>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══════════════════════════════════════════════════════
              CHARGES SECTION — Left 3 columns + Right "Other Charges"
              ═══════════════════════════════════════════════════════ */}

          {/* ═══ ROW 13: Prepaid | Weight Charge | Collect | Other Charges ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "13%", padding: "3px 5px", borderRight: bs }}>
                  <L>Prepaid</L>
                </div>
                <div style={{ width: "17%", padding: "3px 5px", borderRight: bs }}>
                  <L>Weight Charge</L>
                </div>
                <div style={{ width: "12%", padding: "3px 5px", borderRight: bs }}>
                  <L>Collect</L>
                </div>
                <div style={{ width: "58%", padding: "3px 5px" }}>
                  <L>Other Charges</L>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 14: (empty) | Valuation Change | (empty) | (empty) ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "13%", padding: "3px 5px", borderRight: bs }}>&nbsp;</div>
                <div style={{ width: "17%", padding: "3px 5px", borderRight: bs }}>
                  <L>Valuation Change</L>
                </div>
                <div style={{ width: "12%", padding: "3px 5px", borderRight: bs }}>&nbsp;</div>
                <div style={{ width: "58%", padding: "3px 5px" }}>&nbsp;</div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 15: (empty) | Tax | (empty) | (empty) ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "13%", padding: "3px 5px", borderRight: bs }}>&nbsp;</div>
                <div style={{ width: "17%", padding: "3px 5px", borderRight: bs }}>
                  <L>Tax</L>
                </div>
                <div style={{ width: "12%", padding: "3px 5px", borderRight: bs }}>&nbsp;</div>
                <div style={{ width: "58%", padding: "3px 5px" }}>&nbsp;</div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 16: (empty) | Total Other Charges Due Agent | (empty) | Shipper certifies ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "13%", padding: "3px 5px", borderRight: bs }}>&nbsp;</div>
                <div style={{ width: "17%", padding: "3px 5px", borderRight: bs }}>
                  <L>Total Other Charges Due Agent</L>
                </div>
                <div style={{ width: "12%", padding: "3px 5px", borderRight: bs }}>&nbsp;</div>
                <div style={{ width: "58%", padding: "3px 5px" }}>
                  <div className="text-[6px] leading-tight">
                    Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such
                    part is property described by name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.
                  </div>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 17: (empty) | Total Other Charges Due Carrier | (empty) | Signature of Shipper ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "13%", padding: "3px 5px", borderRight: bs }}>&nbsp;</div>
                <div style={{ width: "17%", padding: "3px 5px", borderRight: bs }}>
                  <L>Total Other Charges Due Carrier</L>
                </div>
                <div style={{ width: "12%", padding: "3px 5px", borderRight: bs }}>&nbsp;</div>
                <div style={{ width: "58%", padding: "3px 5px" }}>
                  <div style={{ borderTop: `1px dashed ${B}`, paddingTop: "3px" }}>
                    <L>Signature of Shipper of his Agent</L>
                    <V className="mt-1 font-semibold">{agentName}</V>
                  </div>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 18: Total Prepaid | Total Collect | (empty right) ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "21%", padding: "3px 5px", borderRight: bs }}>
                  <L>Total Prepaid</L>
                  <V className="mt-0.5">&nbsp;</V>
                </div>
                <div style={{ width: "21%", padding: "3px 5px", borderRight: bs }}>
                  <L>Total Collect</L>
                  <V className="mt-0.5">&nbsp;</V>
                </div>
                <div style={{ width: "58%", padding: "3px 5px" }}>&nbsp;</div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 19: Currency Conversion Rates | CC Charges | (blank right) ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "21%", padding: "3px 5px", borderRight: bs }}>
                  <L>Currency Conversion Rates</L>
                </div>
                <div style={{ width: "21%", padding: "3px 5px", borderRight: bs }}>
                  <L>CC Charges in Dest. Currency</L>
                </div>
                <div style={{ width: "58%", padding: "3px 5px" }}>&nbsp;</div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 20: Executed on (date) | at (place) | Signature — only in right portion ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "42%", borderRight: bs }}>&nbsp;</div>
                <div style={{ width: "58%", padding: 0, borderTop: `1px dashed ${B}` }}>
                  <div className="flex">
                    <div style={{ width: "30%", padding: "3px 5px", borderRight: bs }}>
                      <L>Executed on (date)</L>
                      <V className="mt-0.5">{formatDate(shipment.created_at)}</V>
                    </div>
                    <div style={{ width: "30%", padding: "3px 5px", borderRight: bs }}>
                      <L>at (place)</L>
                      <V className="mt-0.5">{agentCity || airportName}</V>
                    </div>
                    <div style={{ width: "40%", padding: "3px 5px" }}>
                      <L>Signature of Issuing Carrier or its Agent</L>
                      <V className="mt-0.5 font-semibold">{agentName}</V>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 21: For Carrier's Use at Destination | Charges at Destination | Total Collect Charges ═══ */}
          <tr>
            <td colSpan={2} style={{ borderBottom: bs, padding: 0 }}>
              <div className="flex">
                <div style={{ width: "21%", padding: "3px 5px", borderRight: bs }}>
                  <L>For Carrier&apos;s Use only at Destination</L>
                </div>
                <div style={{ width: "21%", padding: "3px 5px", borderRight: bs }}>
                  <L>Charges at Destination</L>
                </div>
                <div style={{ width: "58%", padding: "3px 5px" }}>
                  <L>Total Collect Charges</L>
                </div>
              </div>
            </td>
          </tr>

          {/* ═══ ROW 21: Copy designation ═══ */}
          <tr>
            <td
              colSpan={2}
              className={copy.bgClass}
              style={{ padding: "5px", textAlign: "center", color: copy.color }}
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
