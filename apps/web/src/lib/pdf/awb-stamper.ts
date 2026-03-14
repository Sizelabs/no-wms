import fs from "fs";
import path from "path";

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

// ── Constants ──

const PAGE_HEIGHT = 792;
const LB_TO_KG = 0.453592;
const INTL_DIM_FACTOR = 166;

// ── Field position type ──

interface FieldPos {
  /** X from left edge (pts) */
  x: number;
  /** Y from top edge — screen coords, converted to PDF at draw time */
  y: number;
  maxWidth: number;
  fontSize?: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
  multiline?: boolean;
  lineHeight?: number;
}

// ── Coordinate map — all values in screen coords (origin top-left, y↓) ──
// Derived from pdftotext bounding-box extraction of the IATA AWB template.
// Labels sit ~3-4pt below cell top; values placed ~12pt below label top.

const FIELDS: Record<string, FieldPos> = {
  /* ── Shipper (top-left, cell y≈18–88) ── */
  shipperName:  { x: 44, y: 42, maxWidth: 254, fontSize: 9, bold: true },
  shipperLine1: { x: 44, y: 53, maxWidth: 254, fontSize: 7.5 },
  shipperLine2: { x: 44, y: 62, maxWidth: 254, fontSize: 7.5 },
  shipperLine3: { x: 44, y: 71, maxWidth: 254, fontSize: 7.5 },
  shipperLine4: { x: 44, y: 80, maxWidth: 254, fontSize: 7.5 },

  /* ── Carrier / AWB header (top-right, cell y≈18–72) ── */
  /* "Issued by" label at y≈36; carrier details below it */
  issuedByName:  { x: 390, y: 50, maxWidth: 170, fontSize: 8, bold: true },
  issuedByAddr1: { x: 390, y: 60, maxWidth: 170, fontSize: 7.5 },
  issuedByAddr2: { x: 390, y: 69, maxWidth: 170, fontSize: 7.5 },
  awbNumber:     { x: 566, y: 26, maxWidth: 150, fontSize: 11, align: "right", bold: true },

  /* ── Consignee (left, cell y≈88–158) ── */
  consigneeName:  { x: 44, y: 110, maxWidth: 254, fontSize: 9, bold: true },
  consigneeLine1: { x: 44, y: 122, maxWidth: 254, fontSize: 7.5 },
  consigneeLine2: { x: 44, y: 131, maxWidth: 254, fontSize: 7.5 },
  consigneeLine3: { x: 44, y: 140, maxWidth: 254, fontSize: 7.5 },
  consigneeLine4: { x: 44, y: 149, maxWidth: 254, fontSize: 7.5 },

  /* ── Issuing Carrier's Agent (left, cell y≈158–206) — full address ── */
  agentName:  { x: 44, y: 180, maxWidth: 254, fontSize: 8, bold: true },
  agentAddr1: { x: 44, y: 191, maxWidth: 254, fontSize: 7.5 },
  agentAddr2: { x: 44, y: 200, maxWidth: 254, fontSize: 7.5 },

  /* ── Accounting Information (right, cell y≈158–230) ── */
  accountingLine1: { x: 306, y: 180, maxWidth: 258, fontSize: 7.5 },
  accountingLine2: { x: 306, y: 191, maxWidth: 258, fontSize: 7.5 },
  accountingLine3: { x: 306, y: 202, maxWidth: 258, fontSize: 7.5 },

  /* ── Agent's IATA Code (left sub-cell, y≈206–230) ── */
  iataCode:  { x: 44, y: 222, maxWidth: 123, fontSize: 8 },
  /* ── Account No. (right sub-cell, y≈206–230) ── */
  accountNo: { x: 175, y: 222, maxWidth: 123, fontSize: 8 },

  /* ── Airport of Departure (left, y≈230–252) ── */
  departureAirport: { x: 44, y: 249, maxWidth: 254, fontSize: 8, bold: true },
  /* ── Reference Number (right sub-cell) ── */
  referenceNumber: { x: 306, y: 249, maxWidth: 90, fontSize: 7.5 },
  /* ── Optional Shipping Info (far right sub-cell) ── */
  optionalShipping: { x: 404, y: 249, maxWidth: 160, fontSize: 7.5 },

  /* ── Routing row (y≈252–275) — many small cells ── */
  /* Values at y=271 to clear the PPD/COLL sub-labels at y≈262 */
  toAirport:       { x: 44, y: 271, maxWidth: 23, fontSize: 8, bold: true },
  byFirstCarrier:  { x: 72, y: 271, maxWidth: 124, fontSize: 7.5 },
  toSecond:        { x: 202, y: 271, maxWidth: 23, fontSize: 7.5 },
  bySecond:        { x: 230, y: 271, maxWidth: 20, fontSize: 7.5 },
  toThird:         { x: 254, y: 271, maxWidth: 23, fontSize: 7.5 },
  byThird:         { x: 281, y: 271, maxWidth: 18, fontSize: 7.5 },
  currency:        { x: 306, y: 271, maxWidth: 22, fontSize: 7, align: "center" },
  chgsCode:        { x: 330, y: 271, maxWidth: 12, fontSize: 7, align: "center" },
  wtValPpd:        { x: 346, y: 271, maxWidth: 14, fontSize: 7, align: "center", bold: true },
  otherPpd:        { x: 374, y: 271, maxWidth: 14, fontSize: 7, align: "center", bold: true },
  declaredCarriage: { x: 404, y: 271, maxWidth: 80, fontSize: 7.5, align: "center" },
  declaredCustoms:  { x: 490, y: 271, maxWidth: 76, fontSize: 7.5, align: "center" },

  /* ── Airport of Destination row (y≈275–300) ── */
  destAirport:      { x: 44, y: 296, maxWidth: 126, fontSize: 8, bold: true },
  flightDate:       { x: 132, y: 296, maxWidth: 68, fontSize: 7 },
  amountInsurance:  { x: 312, y: 296, maxWidth: 55, fontSize: 7 },

  /* ── Handling Information (y≈300–336) ── */
  handlingInfo: { x: 44, y: 318, maxWidth: 470, fontSize: 7, multiline: true, lineHeight: 9 },

  /* ── SCI (far-right of row below handling, y≈316–336) ── */
  sciText: { x: 490, y: 330, maxWidth: 75, fontSize: 6, multiline: true, lineHeight: 7 },

  /* ── Rate Description values (y≈362–517, tall area) ── */
  pieces:           { x: 42, y: 382, maxWidth: 26, fontSize: 9, align: "center", bold: true },
  grossWeightKg:    { x: 70, y: 382, maxWidth: 56, fontSize: 9, align: "center", bold: true },
  grossWeightLb:    { x: 70, y: 394, maxWidth: 56, fontSize: 8, align: "center" },
  rateClass:        { x: 133, y: 382, maxWidth: 62, fontSize: 8, align: "center" },
  chargeableWeight: { x: 198, y: 382, maxWidth: 64, fontSize: 9, align: "center", bold: true },
  rateCharge:       { x: 266, y: 382, maxWidth: 68, fontSize: 8, align: "center" },
  totalCharge:      { x: 340, y: 382, maxWidth: 68, fontSize: 8, align: "center" },
  natureOfGoods:    { x: 420, y: 382, maxWidth: 146, fontSize: 7, multiline: true, lineHeight: 9 },

  /* ── Bottom totals (just above Prepaid row, y≈510) ── */
  bottomPieces: { x: 42, y: 508, maxWidth: 26, fontSize: 8, align: "center", bold: true },
  bottomWeight: { x: 70, y: 508, maxWidth: 56, fontSize: 8, align: "center", bold: true },

  /* ── Charges section (y≈517+) ── */
  totalOtherAgent:   { x: 180, y: 600, maxWidth: 55, fontSize: 7.5, align: "right" },
  totalOtherCarrier: { x: 180, y: 623, maxWidth: 55, fontSize: 7.5, align: "right" },

  /* ── Signature of Shipper or his Agent — multi-line address block ── */
  shipperSigLine1: { x: 310, y: 648, maxWidth: 254, fontSize: 7.5, bold: true },
  shipperSigLine2: { x: 310, y: 657, maxWidth: 254, fontSize: 7.5 },
  shipperSigLine3: { x: 310, y: 666, maxWidth: 254, fontSize: 7.5 },

  /* ── Total Prepaid / Total Collect ── */
  totalPrepaid: { x: 44, y: 654, maxWidth: 120, fontSize: 8, align: "center", bold: true },
  totalCollect: { x: 170, y: 654, maxWidth: 72, fontSize: 8, align: "center" },

  /* ── Currency Conversion / CC Charges ── */
  currencyConversion: { x: 44, y: 676, maxWidth: 110, fontSize: 7 },
  ccCharges:          { x: 160, y: 676, maxWidth: 80, fontSize: 7 },

  /* ── Executed on / at / Signature of Carrier ── */
  executedDate:      { x: 295, y: 682, maxWidth: 78, fontSize: 7 },
  executedPlace:     { x: 402, y: 682, maxWidth: 76, fontSize: 7 },
  carrierSignature:  { x: 484, y: 689, maxWidth: 84, fontSize: 6.5, bold: true },

  /* ── HAWB/MAWB number repeated at form bottom ── */
  awbBottom: { x: 420, y: 704, maxWidth: 146, fontSize: 9, align: "center", bold: true },
};

// ── Drawing helpers ──

function toY(screenY: number): number {
  return PAGE_HEIGHT - screenY;
}

function drawField(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  _fontMono: PDFFont,
  fieldName: string,
  value: string,
) {
  const f = FIELDS[fieldName];
  if (!f || !value) return;

  const size = f.fontSize ?? 8;
  const usedFont = f.bold ? fontBold : font;
  const color = rgb(0, 0, 0);

  if (f.multiline) {
    const lines = wrapText(value, usedFont, size, f.maxWidth);
    const lh = f.lineHeight ?? size + 2;
    for (let i = 0; i < lines.length; i++) {
      const ly = toY(f.y + i * lh);
      if (ly < 20) break; // don't draw off page
      page.drawText(lines[i]!, { x: f.x, y: ly, size, font: usedFont, color });
    }
    return;
  }

  // Truncate if too wide
  let text = value;
  while (usedFont.widthOfTextAtSize(text, size) > f.maxWidth && text.length > 1) {
    text = text.slice(0, -1);
  }

  let drawX = f.x;
  if (f.align === "center") {
    drawX = f.x + (f.maxWidth - usedFont.widthOfTextAtSize(text, size)) / 2;
  } else if (f.align === "right") {
    drawX = f.x - usedFont.widthOfTextAtSize(text, size);
  }

  page.drawText(text, { x: drawX, y: toY(f.y), size, font: usedFont, color });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        result.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

// ── Template loading ──

let cachedTemplate: Uint8Array | null = null;

async function loadTemplate(): Promise<Uint8Array> {
  if (cachedTemplate) return cachedTemplate;
  const templatePath = path.join(process.cwd(), "public", "templates", "awb-blank.pdf");
  cachedTemplate = fs.readFileSync(templatePath);
  return cachedTemplate;
}

// ── Generic stamping ──

async function stampAwbPdf(values: Record<string, string>): Promise<Uint8Array> {
  const templateBytes = await loadTemplate();
  const pdf = await PDFDocument.load(templateBytes);
  const page = pdf.getPages()[0]!;

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdf.embedFont(StandardFonts.Courier);

  for (const [key, value] of Object.entries(values)) {
    if (value && FIELDS[key]) {
      drawField(page, font, fontBold, fontMono, key, value);
    }
  }

  return pdf.save();
}

// ── Weight / measure helpers ──

function lbToKg(lb: number | null): number {
  if (lb == null) return 0;
  return lb * LB_TO_KG;
}

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (val == null) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

// ── HAWB-specific types & mapping ──

interface HawbStampInput {
  si: {
    si_number: string;
    special_instructions: string | null;
    additional_charges: Array<{ description: string; amount: number }> | null;
    total_declared_value_usd: number | null;
    agencies: {
      name: string;
      code: string;
      ruc: string | null;
      address: string | null;
      phone: string | null;
      email: string | null;
      couriers: { name: string; code: string; address: string | null; city: string | null; phone: string | null; email: string | null } | Array<{ name: string }> | null;
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
    destinations: { city: string; country_code: string } | null;
    hawbs: Array<{
      hawb_number: string;
      pieces: number | null;
      weight_lb: number | null;
      created_at: string;
      shipments: {
        awb_number: string | null;
        carrier_name: string | null;
        flight_number: string | null;
        departure_date: string | null;
        departure_airport: string | null;
        arrival_airport: string | null;
      } | Array<Record<string, unknown>> | null;
    }> | null;
    warehouses: {
      name: string;
      city: string | null;
      full_address: string | null;
      phone: string | null;
    } | null;
    shipping_instruction_items: Array<{
      warehouse_receipts: {
        total_packages: number | null;
        has_dgr_package: boolean;
        packages: Array<{
          package_type: string | null;
          pieces_count: number;
          length_in: number | null;
          width_in: number | null;
          height_in: number | null;
          is_dgr: boolean;
          dgr_class: string | null;
          content_description: string | null;
        }> | null;
      } | null;
    }> | null;
  };
  settings: Record<string, string>;
  org: { name: string } | null;
}

function mapHawbToFields(input: HawbStampInput): Record<string, string> {
  const { si, settings, org } = input;
  const hawb = si.hawbs?.[0];
  if (!hawb) return {};

  const shipment = unwrap(hawb.shipments as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
  const courier = unwrap(si.agencies?.couriers as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
  const items = si.shipping_instruction_items ?? [];
  const charges = si.additional_charges ?? [];
  const totalOther = charges.reduce((s, c) => s + (c.amount ?? 0), 0);

  const grossKg = lbToKg(hawb.weight_lb);
  const volumeKg = calcVolumeWeightKg(items);
  const chargeableKg = Math.max(grossKg, volumeKg);

  // Shipper = agency
  const shipperLines = buildAddressLines(
    si.agencies?.name ?? "",
    si.agencies?.address ?? "",
    si.agencies?.ruc ? `RUC: ${si.agencies.ruc}` : null,
    si.agencies?.phone ? `Tel: ${si.agencies.phone}` : null,
    si.agencies?.email ?? null,
  );

  // Consignee
  const consignee = si.consignees;
  const consigneeAddr = [consignee?.address_line1, consignee?.address_line2, consignee?.city, consignee?.province, consignee?.postal_code].filter(Boolean).join(", ");
  const consigneeLines = buildAddressLines(
    consignee?.full_name ?? "",
    consigneeAddr,
    consignee?.cedula_ruc ? `ID: ${consignee.cedula_ruc}` : null,
    consignee?.phone ? `Tel: ${consignee.phone}` : null,
    consignee?.email ?? null,
  );

  const destCity = si.destinations?.city?.toUpperCase() ?? "";
  const toAirport = (shipment?.arrival_airport as string)?.toUpperCase() || destCity;
  const carrierName = (shipment?.carrier_name as string) ?? (courier?.name as string) ?? "";
  const mawbNumber = (shipment?.awb_number as string) ?? "";
  const flightNumber = (shipment?.flight_number as string) ?? "";
  const depDate = shipment?.departure_date as string | null;

  const goodsDesc = buildGoodsDescription(items);

  // Agent address lines
  const agentAddrParts = [si.warehouses?.city, si.warehouses?.full_address].filter(Boolean);
  const agentAddr1 = agentAddrParts[0] ?? "";
  const agentAddr2 = agentAddrParts[1] ?? "";

  // Issued by (carrier/agent) in top-right
  const courierName = (courier?.name as string) ?? "";
  const courierAddr = (courier?.address as string) ?? "";
  const courierCity = (courier?.city as string) ?? "";

  const piecesStr = String(hawb.pieces ?? 0);

  const values: Record<string, string> = {
    shipperName: shipperLines[0] ?? "",
    shipperLine1: shipperLines[1] ?? "",
    shipperLine2: shipperLines[2] ?? "",
    shipperLine3: shipperLines[3] ?? "",
    shipperLine4: shipperLines[4] ?? "",

    issuedByName: carrierName || courierName,
    issuedByAddr1: courierAddr,
    issuedByAddr2: courierCity,
    awbNumber: hawb.hawb_number,

    consigneeName: consigneeLines[0] ?? "",
    consigneeLine1: consigneeLines[1] ?? "",
    consigneeLine2: consigneeLines[2] ?? "",
    consigneeLine3: consigneeLines[3] ?? "",
    consigneeLine4: consigneeLines[4] ?? "",

    agentName: org?.name ?? "",
    agentAddr1,
    agentAddr2,

    accountingLine1: mawbNumber ? `MAWB: ${mawbNumber}` : "",
    accountingLine2: `REF: ${si.si_number}`,

    iataCode: settings.hawb_iata_code ?? "",
    accountNo: settings.hawb_account_no ?? "",

    departureAirport: settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT",
    referenceNumber: si.si_number,

    toAirport,
    byFirstCarrier: carrierName,
    currency: "USD",
    chgsCode: "PP",
    wtValPpd: "X",
    otherPpd: "X",
    declaredCarriage: si.total_declared_value_usd != null ? fmtNum(si.total_declared_value_usd) : "NVD",
    declaredCustoms: si.total_declared_value_usd != null ? fmtNum(si.total_declared_value_usd) : "NCV",

    destAirport: destCity,
    flightDate: `${flightNumber}${depDate ? ` / ${fmtDate(depDate)}` : ""}`,
    amountInsurance: "NIL",

    handlingInfo: si.special_instructions ?? "",
    sciText: "",

    pieces: piecesStr,
    grossWeightKg: fmtNum(grossKg),
    grossWeightLb: hawb.weight_lb != null ? `${fmtNum(hawb.weight_lb)} LB` : "",
    rateClass: "G.C.",
    chargeableWeight: fmtNum(chargeableKg),
    natureOfGoods: goodsDesc,

    bottomPieces: piecesStr,
    bottomWeight: fmtNum(grossKg),

    totalOtherAgent: totalOther > 0 ? fmtNum(totalOther) : "",
    totalPrepaid: totalOther > 0 ? fmtNum(totalOther) : "",

    shipperSigLine1: org?.name ?? "",
    shipperSigLine2: si.warehouses?.full_address ?? "",
    shipperSigLine3: si.warehouses?.phone ? `Tel: ${si.warehouses.phone}` : "",
    executedDate: fmtDate(hawb.created_at),
    executedPlace: settings.hawb_airport_name || "MIAMI",
    carrierSignature: org?.name ?? "",

    awbBottom: hawb.hawb_number,
  };

  return values;
}

// ── MAWB-specific types & mapping ──

interface MawbStampInput {
  shipment: {
    shipment_number: string;
    awb_number: string | null;
    flight_number: string | null;
    departure_date: string | null;
    arrival_airport: string | null;
    shipper_name: string | null;
    shipper_address: string | null;
    consignee_name: string | null;
    consignee_address: string | null;
    total_pieces: number | null;
    total_weight_lb: number | null;
    notes: string | null;
    created_at: string;
    carriers: { name: string; code: string } | Array<{ name: string; code: string }> | null;
    destinations: { city: string; country_code: string } | Array<{ city: string; country_code: string }> | null;
    agencies: { name: string; code: string; address: string | null; phone: string | null; email: string | null } | null;
    warehouses: { name: string; city: string | null; full_address: string | null; phone: string | null } | null;
    hawbs: Array<{
      hawb_number: string;
      pieces: number | null;
      weight_lb: number | null;
      shipping_instructions: {
        si_number: string;
        total_declared_value_usd: number | null;
        shipping_instruction_items: Array<{
          warehouse_receipts: {
            total_packages: number | null;
            has_dgr_package: boolean;
            packages: Array<{
              package_type: string | null;
              pieces_count: number;
              length_in: number | null;
              width_in: number | null;
              height_in: number | null;
              is_dgr: boolean;
              dgr_class: string | null;
              content_description: string | null;
            }> | null;
          } | null;
        }> | null;
      } | Array<Record<string, unknown>> | null;
    }> | null;
  };
  settings: Record<string, string>;
  org: { name: string } | null;
}

function mapMawbToFields(input: MawbStampInput): Record<string, string> {
  const { shipment, settings, org } = input;
  const carrier = unwrap(shipment.carriers);
  const destination = unwrap(shipment.destinations);
  const hawbs = shipment.hawbs ?? [];

  // Totals
  const totalPieces = shipment.total_pieces ?? hawbs.reduce((s, h) => s + (h.pieces ?? 0), 0);
  const totalWeightLb = shipment.total_weight_lb ?? hawbs.reduce((s, h) => s + (h.weight_lb ?? 0), 0);
  const grossKg = lbToKg(totalWeightLb);

  // Volume weight from all items
  const allItems: Array<{
    warehouse_receipts: {
      total_packages: number | null;
      has_dgr_package: boolean;
      packages: Array<{
        package_type: string | null;
        pieces_count: number;
        length_in: number | null;
        width_in: number | null;
        height_in: number | null;
        is_dgr: boolean;
        dgr_class: string | null;
        content_description: string | null;
      }> | null;
    } | null;
  }> = [];
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
    if (si?.shipping_instruction_items) {
      for (const item of si.shipping_instruction_items as Array<Record<string, unknown>>) {
        allItems.push(item as typeof allItems[number]);
      }
    }
  }
  const volumeKg = calcVolumeWeightKg(allItems);
  const chargeableKg = Math.max(grossKg, volumeKg);

  // Declared value
  let declaredTotal: number | null = null;
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
    const val = si?.total_declared_value_usd as number | null;
    if (val != null) {
      declaredTotal = (declaredTotal ?? 0) + val;
    }
  }

  const shipperName = shipment.shipper_name || org?.name || "";
  const shipperAddress = shipment.shipper_address || shipment.warehouses?.full_address || "";
  const shipperPhone = shipment.warehouses?.phone ?? "";

  const consigneeName = shipment.consignee_name || shipment.agencies?.name || "";
  const consigneeAddress = shipment.consignee_address || shipment.agencies?.address || "";

  const toAirport = shipment.arrival_airport?.toUpperCase() || destination?.city?.toUpperCase() || "";
  const carrierName = carrier?.name ?? "";
  const awbNumber = shipment.awb_number ?? "";

  // Goods description from all HAWBs
  const goodsDesc = buildMawbGoodsDescription(hawbs);

  // Accounting: list HAWB numbers
  const hawbNumbers = hawbs.map((h) => h.hawb_number).join(", ");

  const shipperLines = buildAddressLines(shipperName, shipperAddress, shipperPhone ? `Tel: ${shipperPhone}` : null);
  const consigneeLines = buildAddressLines(
    consigneeName,
    consigneeAddress,
    shipment.agencies?.phone ? `Tel: ${shipment.agencies.phone}` : null,
  );

  // Agent address lines
  const agentAddrParts = [shipment.warehouses?.city, shipment.warehouses?.full_address].filter(Boolean);
  const agentAddr1 = agentAddrParts[0] ?? "";
  const agentAddr2 = agentAddrParts[1] ?? "";

  const piecesStr = String(totalPieces);

  const values: Record<string, string> = {
    shipperName: shipperLines[0] ?? "",
    shipperLine1: shipperLines[1] ?? "",
    shipperLine2: shipperLines[2] ?? "",
    shipperLine3: shipperLines[3] ?? "",

    issuedByName: carrierName,
    issuedByAddr1: carrier?.code ?? "",
    issuedByAddr2: "",
    awbNumber,

    consigneeName: consigneeLines[0] ?? "",
    consigneeLine1: consigneeLines[1] ?? "",
    consigneeLine2: consigneeLines[2] ?? "",
    consigneeLine3: consigneeLines[3] ?? "",

    agentName: org?.name ?? "",
    agentAddr1,
    agentAddr2,

    accountingLine1: hawbNumbers,
    accountingLine2: `REF: ${shipment.shipment_number}`,

    iataCode: settings.hawb_iata_code ?? "",
    accountNo: settings.hawb_account_no ?? "",

    departureAirport: settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT",
    referenceNumber: shipment.shipment_number,

    toAirport,
    byFirstCarrier: carrierName,
    currency: "USD",
    chgsCode: "PP",
    wtValPpd: "X",
    otherPpd: "X",
    declaredCarriage: declaredTotal != null ? fmtNum(declaredTotal) : "NVD",
    declaredCustoms: declaredTotal != null ? fmtNum(declaredTotal) : "NCV",

    destAirport: toAirport,
    flightDate: `${shipment.flight_number ?? ""}${shipment.departure_date ? ` / ${fmtDate(shipment.departure_date)}` : ""}`,
    amountInsurance: "NIL",

    handlingInfo: shipment.notes ?? "",
    sciText: "",

    pieces: piecesStr,
    grossWeightKg: fmtNum(grossKg),
    grossWeightLb: totalWeightLb ? `${fmtNum(totalWeightLb)} LB` : "",
    rateClass: "Q",
    chargeableWeight: fmtNum(chargeableKg),
    natureOfGoods: goodsDesc,

    bottomPieces: piecesStr,
    bottomWeight: fmtNum(grossKg),

    shipperSigLine1: org?.name ?? "",
    shipperSigLine2: shipment.warehouses?.full_address ?? "",
    shipperSigLine3: shipment.warehouses?.phone ? `Tel: ${shipment.warehouses.phone}` : "",
    executedDate: fmtDate(shipment.created_at),
    executedPlace: shipment.warehouses?.city || settings.hawb_airport_name || "MIAMI",
    carrierSignature: org?.name ?? "",

    awbBottom: awbNumber,
  };

  return values;
}

// ── Shared helpers ──

function buildAddressLines(name: string, address: string, ...extras: (string | null)[]): string[] {
  const lines: string[] = [name];
  if (address) lines.push(address);
  for (const e of extras) {
    if (e) lines.push(e);
  }
  return lines;
}

function calcVolumeWeightKg(
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

function buildGoodsDescription(
  items: Array<{
    warehouse_receipts: {
      total_packages: number | null;
      has_dgr_package: boolean;
      packages: Array<{
        package_type: string | null;
        content_description: string | null;
        is_dgr: boolean;
        dgr_class: string | null;
      }> | null;
    } | null;
  }>,
): string {
  const lines: string[] = ["CONSOLIDATED CARGO AS PER ATTACHED MANIFEST"];
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
    const typeStr = types.size > 0 ? Array.from(types).join(", ").toUpperCase() : "PACKAGES";
    lines.push(`${totalPkgs} ${typeStr}`);
  }
  if (descs.length > 0) {
    lines.push([...new Set(descs)].join("; ").toUpperCase());
  }
  lines.push(
    isDgr
      ? `DANGEROUS GOODS AS PER ATTACHED SHIPPER'S DECLARATION${dgrClasses.size > 0 ? ` - CLASS ${Array.from(dgrClasses).join(", ")}` : ""}`
      : "NO DANGEROUS GOODS AS PER ATTACHED SHIPPER'S DECLARATION",
  );
  return lines.join("\n");
}

function buildMawbGoodsDescription(
  hawbs: Array<{
    shipping_instructions: Record<string, unknown> | Record<string, unknown>[] | null;
  }>,
): string {
  const items: Array<{
    warehouse_receipts: {
      total_packages: number | null;
      has_dgr_package: boolean;
      packages: Array<{
        package_type: string | null;
        content_description: string | null;
        is_dgr: boolean;
        dgr_class: string | null;
      }> | null;
    } | null;
  }> = [];

  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions) as Record<string, unknown> | null;
    if (!si?.shipping_instruction_items) continue;
    for (const item of si.shipping_instruction_items as Array<Record<string, unknown>>) {
      items.push(item as typeof items[number]);
    }
  }

  return buildGoodsDescription(items);
}

// ── Public API ──

export async function stampHawbPdf(input: HawbStampInput): Promise<Uint8Array> {
  const values = mapHawbToFields(input);
  return stampAwbPdf(values);
}

export async function stampMawbPdf(input: MawbStampInput): Promise<Uint8Array> {
  const values = mapMawbToFields(input);
  return stampAwbPdf(values);
}
