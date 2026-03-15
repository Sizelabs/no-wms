import fs from "fs";
import path from "path";

import { PDFDocument, PDFPage, StandardFonts, type PDFFont } from "pdf-lib";

import type { HawbStampInput, MawbStampInput } from "./awb-pdf";

// ── Constants ──

const PAGE_HEIGHT = 792;
const LB_TO_KG = 0.453592;
const INTL_DIM_FACTOR = 166;

// ── Template cache ──

let cachedTemplate: Uint8Array | null = null;

function loadTemplate(): Uint8Array {
  if (cachedTemplate) return cachedTemplate;
  const p = path.join(process.cwd(), "public", "templates", "awb-template-blank.pdf");
  cachedTemplate = fs.readFileSync(p);
  return cachedTemplate;
}

// ── Drawing helpers ──

/** Convert screen-Y (origin top-left, y↓) to PDF-Y (origin bottom-left, y↑) */
function toY(screenY: number): number {
  return PAGE_HEIGHT - screenY;
}

function drawText(
  page: PDFPage,
  font: PDFFont,
  x: number,
  screenY: number,
  text: string,
  size = 8.5,
) {
  if (!text) return;
  page.drawText(text, { x, y: toY(screenY), size, font });
}

/** Draw text right-aligned: x is the right edge */
function drawTextRight(
  page: PDFPage,
  font: PDFFont,
  xRight: number,
  screenY: number,
  text: string,
  size = 8.5,
) {
  if (!text) return;
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: xRight - width, y: toY(screenY), size, font });
}

/** Draw text centered: xCenter is the center point */
function drawTextCenter(
  page: PDFPage,
  font: PDFFont,
  xCenter: number,
  screenY: number,
  text: string,
  size = 8.5,
) {
  if (!text) return;
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: xCenter - width / 2, y: toY(screenY), size, font });
}

function drawMultiline(
  page: PDFPage,
  font: PDFFont,
  x: number,
  screenY: number,
  lines: string[],
  size = 6,
  lineHeight = 10,
) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      drawText(page, font, x, screenY + i * lineHeight, lines[i]!, size);
    }
  }
}

// ── Data helpers ──

function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (val == null) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

function lbToKg(lb: number | null): number {
  return lb == null ? 0 : lb * LB_TO_KG;
}

function fmt(n: number, d = 2): string {
  return n.toFixed(d);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function calcVolumeKg(
  items: Array<{
    warehouse_receipts: {
      packages: Array<{
        length_in: number | null;
        width_in: number | null;
        height_in: number | null;
      }> | null;
    } | null;
  }>,
): number {
  let total = 0;
  for (const item of items) {
    for (const pkg of item.warehouse_receipts?.packages ?? []) {
      if (pkg.length_in != null && pkg.width_in != null && pkg.height_in != null) {
        total += ((pkg.length_in * pkg.width_in * pkg.height_in) / INTL_DIM_FACTOR) * LB_TO_KG;
      }
    }
  }
  return total;
}

function buildGoodsLines(
  items: Array<{
    warehouse_receipts: {
      total_packages: number | null;
      has_dgr_package: boolean;
      packages: Array<{
        package_type: string | null;
        content_description: string | null;
        is_dgr: boolean;
        dgr_class: string | null;
        pieces_count: number;
      }> | null;
    } | null;
  }>,
): string[] {
  const lines: string[] = ["CONSOLIDATED CARGO AS PER"];
  lines.push("ATTACHED MANIFEST");
  let totalPkgs = 0;
  const types = new Set<string>();
  const descs: string[] = [];
  let isDgr = false;
  const dgrClasses = new Set<string>();

  for (const item of items) {
    const wr = item.warehouse_receipts;
    if (!wr) continue;
    if (wr.has_dgr_package) isDgr = true;
    totalPkgs += wr.total_packages ?? wr.packages?.length ?? 0;
    for (const pkg of wr.packages ?? []) {
      if (pkg.content_description) descs.push(pkg.content_description);
      if (pkg.package_type) types.add(pkg.package_type);
      if (pkg.is_dgr) {
        isDgr = true;
        if (pkg.dgr_class) dgrClasses.add(pkg.dgr_class);
      }
    }
  }

  if (totalPkgs > 0) {
    const typeStr = types.size > 0 ? Array.from(types).join(", ").toUpperCase() : "PKGS";
    lines.push(`${totalPkgs} ${typeStr}`);
  }
  if (descs.length > 0) {
    const unique = [...new Set(descs)].join("; ").toUpperCase();
    // Split long descriptions into ~25-char chunks
    for (let i = 0; i < unique.length; i += 25) {
      lines.push(unique.slice(i, i + 25));
    }
  }
  lines.push(isDgr ? "DGR PER DECLARATION" : "NO DGR PER DECLARATION");
  return lines;
}

// ── Coordinate map ──
// All positions in screen coords (origin top-left, y↓).
// Derived from the Excel-exported blank template (awb-template-blank.pdf, 612×792).
//
// Vertical reference (screenY of section labels):
//   55  Shipper's Name and Address
//   82  Issued by
//  118  Consignee's Name and Address
//  178  Issuing Carrier's Agent / Accounting Information
//  210  Agent's IATA Code / Account No.
//  225  Airport of Departure
//  240  To / By First Carrier / Routing row
//  252  PPD / COLL sub-labels
//  260  Airport of Destination
//  295  Handling Information
//  335  No. of Pieces / Gross Weight / Rate Class headers
//  530  Prepaid / Weight Charge / Collect
//  555  Valuation Charge
//  575  Tax
//  600  Total Other Charges Due Agent
//  625  Total Other Charges Due Carrier
//  675  Total Prepaid / Total Collect
//  695  Currency Conversion Rates
//  715  Executed on (date) / at (place)

// ── HAWB stamping ──

function stampHawbFields(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  input: HawbStampInput,
) {
  const { si, settings, org } = input;
  const hawb = si.hawbs?.[0];
  if (!hawb) return;

  const shipment = unwrap(
    hawb.shipments as Record<string, unknown> | Record<string, unknown>[] | null,
  ) as Record<string, unknown> | null;
  const courier = unwrap(
    si.agencies?.couriers as Record<string, unknown> | Record<string, unknown>[] | null,
  ) as Record<string, unknown> | null;
  const items = si.shipping_instruction_items ?? [];
  const charges = si.additional_charges ?? [];
  const totalOther = charges.reduce((s, c) => s + (c.amount ?? 0), 0);

  const grossKg = lbToKg(hawb.weight_lb);
  const volumeKg = calcVolumeKg(items);
  const chargeableKg = Math.max(grossKg, volumeKg);
  const cons = si.consignees;
  const departureAirport = (shipment?.departure_airport as string)?.toUpperCase() || settings.hawb_departure_iata || "MIA";
  const arrivalAirport = (shipment?.arrival_airport as string)?.toUpperCase() || "";
  const carrierName = (shipment?.carrier_name as string) ?? "";
  const courierName = (courier?.name as string) ?? "";
  const byFirstCarrier = carrierName || courierName;
  const mawbNumber = (shipment?.awb_number as string) ?? "";
  const depDate = shipment?.departure_date as string | null;
  const arrDate = (shipment as Record<string, unknown> | null)?.arrival_date as string | null;
  const flightDate = depDate ? fmtDate(depDate) : "";
  const flightDate2 = arrDate ? fmtDate(arrDate) : "";
  const piecesStr = String(hawb.pieces ?? 0);

  const t = (x: number, sy: number, text: string, sz?: number) => drawText(page, font, x, sy, text, sz);
  const tb = (x: number, sy: number, text: string, sz?: number) => drawText(page, fontBold, x, sy, text, sz);

  // AWB Number
  tb(500, 30, hawb.hawb_number, 9.5);
  tb(495, 738, hawb.hawb_number, 7);

  // "AIR WAYBILL" title below "Not Negotiable"
  tb(365, 68, "AIR WAYBILL", 9.5);

  // Shipper = Agency
  tb(40, 73, si.agencies?.name ?? "");
  t(40, 83, si.agencies?.address ?? "", 8);
  t(40, 93, si.agencies?.ruc ? `RUC: ${si.agencies.ruc}` : (si.agencies?.phone ? `Tel: ${si.agencies.phone}` : ""), 8);
  t(40, 103, si.agencies?.email ?? (si.agencies?.ruc && si.agencies?.phone ? `Tel: ${si.agencies.phone}` : ""), 8);

  // Shipper's Account Number (agency code/ID)
  t(195, 68, si.agencies?.code ?? "", 8);

  // Issued by
  tb(365, 80, byFirstCarrier);
  t(365, 90, org?.name ? `Agent: ${org.name}` : "", 7.5);

  // Consignee
  tb(40, 129, cons?.full_name ?? "");
  const consAddrParts = [cons?.address_line1, cons?.address_line2].filter(Boolean);
  const consCityLine = [cons?.city, cons?.province, cons?.postal_code].filter(Boolean).join(", ");
  t(40, 139, consAddrParts[0] ?? "", 8);
  t(40, 149, consAddrParts[1] ?? consCityLine, 8);
  t(40, 159, consAddrParts[1] ? consCityLine : (cons?.cedula_ruc ? `ID: ${cons.cedula_ruc}` : ""), 8);

  // Consignee's Account Number (casillero)
  t(195, 127, cons?.casillero ?? "", 8);

  // Agent / Org
  tb(40, 187, org?.name ?? "");
  t(40, 196, si.warehouses?.city ?? "", 8);
  t(40, 205, si.warehouses?.full_address ?? "", 7.5);

  // Accounting Information
  t(320, 187, mawbNumber ? `MAWB: ${mawbNumber}` : "", 8);
  t(320, 196, `REF: ${si.si_number}`, 8);
  t(320, 205, settings.hawb_iata_code ? `IATA: ${settings.hawb_iata_code}` : "", 8);

  // IATA Code / Account No.
  t(32, 218, settings.hawb_iata_code ?? "", 8);
  t(170, 218, settings.hawb_account_no ?? "", 8);

  // Airport of Departure (IATA code)
  tb(40, 234, departureAirport);

  // Routing — "To" is arrival IATA code, "By First Carrier" is MAWB carrier
  tb(40, 256, arrivalAirport);
  t(67, 256, byFirstCarrier, 8);
  t(324, 256, "USD", 8);
  tb(371, 257, "X");
  tb(403, 257, "X");
  drawTextRight(page, font, 495, 256, si.total_declared_value_usd != null ? fmt(si.total_declared_value_usd) : "NVD", 8);
  drawTextRight(page, font, 570, 256, si.total_declared_value_usd != null ? fmt(si.total_declared_value_usd) : "NCV", 8);

  // Destination (IATA code)
  tb(40, 280, arrivalAirport);
  t(177, 280, flightDate, 8);
  t(245, 280, flightDate2, 8);
  drawTextRight(page, font, 345, 280, "NIL", 8);

  // Handling Information
  const handlingLines = (si.special_instructions ?? "").split("\n").slice(0, 3);
  drawMultiline(page, font, 40, 308, handlingLines, 6.5, 7.5);

  // Rate Description
  tb(40, 357, piecesStr);
  drawTextRight(page, fontBold, 107, 357, fmt(grossKg));
  t(113, 357, "K", 8);
  drawTextRight(page, font, 107, 367, hawb.weight_lb != null ? fmt(hawb.weight_lb) : "", 7.5);
  t(113, 367, "L", 8);
  t(155, 357, "G.C.", 8);
  drawTextRight(page, fontBold, 255, 357, fmt(chargeableKg));
  t(270, 357, "AS AGREED", 8);

  // Nature of Goods
  const goodsLines = buildGoodsLines(items);
  drawMultiline(page, font, 448, 357, goodsLines, 6, 10);

  // Bottom totals
  tb(40, 510, piecesStr);
  drawTextRight(page, fontBold, 107, 510, fmt(grossKg));
  t(113, 510, "K", 8);
  drawTextRight(page, font, 107, 520, hawb.weight_lb != null ? fmt(hawb.weight_lb) : "", 7.5);
  t(113, 520, "L", 8);

  // Other Charges
  for (let i = 0; i < charges.length && i < 3; i++) {
    t(310, 540 + i * 22, `${charges[i]!.description}: ${fmt(charges[i]!.amount)}`, 8);
  }

  // Total Other Charges Due Agent
  if (totalOther > 0) tb(55, 608, fmt(totalOther));

  // Total Prepaid
  if (totalOther > 0) tb(55, 682, fmt(totalOther));

  // Execution
  t(274, 705, fmtDate(hawb.created_at), 8);
  drawTextCenter(page, font, 377, 705, settings.hawb_airport_name || "MIAMI", 8);
}

// ── MAWB stamping ──

function stampMawbFields(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  input: MawbStampInput,
) {
  const { shipment, settings, org } = input;
  const carrier = unwrap(shipment.carriers);
  const hawbs = shipment.hawbs ?? [];

  const totalPieces = shipment.total_pieces ?? hawbs.reduce((s, h) => s + (h.pieces ?? 0), 0);
  const totalWeightLb = shipment.total_weight_lb ?? hawbs.reduce((s, h) => s + (h.weight_lb ?? 0), 0);
  const grossKg = lbToKg(totalWeightLb);

  const allItems: Parameters<typeof calcVolumeKg>[0] = [];
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
    if (si?.shipping_instruction_items) {
      for (const item of si.shipping_instruction_items as Array<Record<string, unknown>>) {
        allItems.push(item as (typeof allItems)[number]);
      }
    }
  }
  const volumeKg = calcVolumeKg(allItems);
  const chargeableKg = Math.max(grossKg, volumeKg);

  let declaredTotal: number | null = null;
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
    const val = si?.total_declared_value_usd as number | null;
    if (val != null) declaredTotal = (declaredTotal ?? 0) + val;
  }

  const shipperName = shipment.shipper_name || org?.name || "";
  const shipperAddress = shipment.shipper_address || shipment.warehouses?.full_address || "";
  const departureAirport = (shipment as Record<string, unknown>).departure_airport as string | null;
  const arrivalAirport = shipment.arrival_airport?.toUpperCase() || "";
  const carrierName = carrier?.name ?? "";
  const awbNumber = shipment.awb_number ?? "";
  const flightDate = shipment.departure_date ? fmtDate(shipment.departure_date) : "";
  const flightDate2 = (shipment as Record<string, unknown>).arrival_date ? fmtDate((shipment as Record<string, unknown>).arrival_date as string) : "";
  const piecesStr = String(totalPieces);

  const goodsItems: Parameters<typeof buildGoodsLines>[0] = [];
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
    if (!si?.shipping_instruction_items) continue;
    for (const item of si.shipping_instruction_items as Array<Record<string, unknown>>) {
      goodsItems.push(item as (typeof goodsItems)[number]);
    }
  }
  const goodsLines = buildGoodsLines(goodsItems);
  const hawbNumbers = hawbs.map((h) => h.hawb_number).join(", ");

  const t = (x: number, sy: number, text: string, sz?: number) => drawText(page, font, x, sy, text, sz);
  const tb = (x: number, sy: number, text: string, sz?: number) => drawText(page, fontBold, x, sy, text, sz);

  tb(500, 30, awbNumber, 9.5);
  tb(495, 738, awbNumber, 7);

  // "AIR WAYBILL" title
  tb(365, 68, "AIR WAYBILL", 9.5);

  // Shipper
  tb(40, 73, shipperName);
  t(40, 83, shipperAddress, 8);
  t(40, 93, shipment.warehouses?.phone ? `Tel: ${shipment.warehouses.phone}` : "", 8);

  // Issued by
  tb(365, 80, carrierName);
  t(365, 90, org?.name ? `Agent: ${org.name}` : "", 7.5);

  // Consignee
  const consigneeName = shipment.consignee_name || shipment.agencies?.name || "";
  const consigneeAddress = shipment.consignee_address || shipment.agencies?.address || "";
  tb(40, 129, consigneeName);
  t(40, 139, consigneeAddress, 8);
  t(40, 149, shipment.agencies?.phone ? `Tel: ${shipment.agencies.phone}` : "", 8);

  // Agent / Org
  tb(40, 187, org?.name ?? "");
  t(40, 196, shipment.warehouses?.city ?? "", 8);
  t(40, 205, shipment.warehouses?.full_address ?? "", 7.5);

  // Accounting Information
  t(320, 187, hawbNumbers.length > 40 ? hawbNumbers.slice(0, 40) : hawbNumbers, 7.5);
  t(320, 196, `REF: ${shipment.shipment_number}`, 8);
  t(320, 205, settings.hawb_iata_code ? `IATA: ${settings.hawb_iata_code}` : "", 8);

  // IATA Code / Account No.
  t(32, 218, settings.hawb_iata_code ?? "", 8);
  t(170, 218, settings.hawb_account_no ?? "", 8);

  // Airport of Departure (IATA code)
  tb(40, 234, departureAirport?.toUpperCase() || settings.hawb_departure_iata || "MIA");

  // Routing
  tb(40, 256, arrivalAirport);
  t(67, 256, carrierName, 8);
  t(155, 256, awbNumber, 8);
  t(324, 256, "USD", 8);
  tb(371, 257, "X");
  tb(403, 257, "X");
  drawTextRight(page, font, 495, 256, declaredTotal != null ? fmt(declaredTotal) : "NVD", 8);
  drawTextRight(page, font, 570, 256, declaredTotal != null ? fmt(declaredTotal) : "NCV", 8);

  // Destination
  tb(40, 280, arrivalAirport);
  t(177, 280, flightDate, 8);
  t(245, 280, flightDate2, 8);
  drawTextRight(page, font, 345, 280, "NIL", 8);

  // Handling Information
  const handlingLines = (shipment.notes ?? "").split("\n").slice(0, 3);
  drawMultiline(page, font, 40, 308, handlingLines, 8, 9);

  // Rate Description
  tb(40, 357, piecesStr);
  drawTextRight(page, fontBold, 107, 357, fmt(grossKg));
  t(113, 357, "K", 8);
  drawTextRight(page, font, 107, 367, totalWeightLb ? fmt(totalWeightLb) : "", 7.5);
  t(113, 367, "L", 8);
  t(155, 357, "Q", 8);
  drawTextRight(page, fontBold, 255, 357, fmt(chargeableKg));
  t(270, 357, "AS AGREED", 8);

  // Nature of Goods
  drawMultiline(page, font, 448, 357, goodsLines, 7.5, 10);

  // Bottom totals
  tb(40, 510, piecesStr);
  drawTextRight(page, fontBold, 107, 510, fmt(grossKg));
  t(113, 510, "K", 8);
  drawTextRight(page, font, 107, 520, totalWeightLb ? fmt(totalWeightLb) : "", 7.5);
  t(113, 520, "L", 8);

  // Execution
  t(275, 705, fmtDate(shipment.created_at), 8);
  drawTextCenter(page, font, 377, 705, shipment.warehouses?.city || settings.hawb_airport_name || "MIAMI", 8);
}

// ── Core stamp logic ──

async function stamp(
  fillFn: (page: PDFPage, font: PDFFont, fontBold: PDFFont) => void,
): Promise<Uint8Array> {
  const templateBytes = loadTemplate();
  const pdf = await PDFDocument.load(templateBytes);
  const page = pdf.getPages()[0]!;

  const font = await pdf.embedFont(StandardFonts.Courier);
  const fontBold = await pdf.embedFont(StandardFonts.CourierBold);

  fillFn(page, font, fontBold);

  return pdf.save();
}

// ── Public API ──

export async function stampHawbPdf(input: HawbStampInput): Promise<Uint8Array> {
  return stamp((page, font, fontBold) => stampHawbFields(page, font, fontBold, input));
}

export async function stampMawbPdf(input: MawbStampInput): Promise<Uint8Array> {
  return stamp((page, font, fontBold) => stampMawbFields(page, font, fontBold, input));
}
