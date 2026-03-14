import fs from "fs";
import path from "path";
import { execFile } from "child_process";

import ExcelJS from "exceljs";

import type { HawbStampInput, MawbStampInput } from "./awb-pdf";

// ── Constants ──

const LB_TO_KG = 0.453592;
const INTL_DIM_FACTOR = 166;

// ── Template cache ──

let cachedTemplate: Buffer | null = null;

function loadTemplate(): Buffer {
  if (cachedTemplate) return cachedTemplate;
  const p = path.join(process.cwd(), "public", "templates", "awb-template.xlsx");
  cachedTemplate = fs.readFileSync(p);
  return cachedTemplate;
}

// ── Helpers ──

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
      ? `DGR AS PER DECLARATION${dgrClasses.size > 0 ? ` - CLASS ${Array.from(dgrClasses).join(", ")}` : ""}`
      : "NO DGR AS PER DECLARATION",
  );
  return lines;
}

// ── Cell mapping ──
//
// The Excel template uses a fine grid (56 columns × 80 rows) with very narrow
// columns (~1.66 chars each). Labels are pre-filled; data goes in the empty
// cells below or beside them.
//
// Column reference: A=1 ... Z=26, AA=27 ... AZ=52, BA=53, BB=54, BC=55, BD=56
// Columns BB (width=8) and BC (width=15.5) are wider for the goods description.

// Font style for data values — Courier New gives a typewriter look
const DATA_FONT: Partial<ExcelJS.Font> = { name: "Courier New", size: 7 };
const DATA_FONT_BOLD: Partial<ExcelJS.Font> = { name: "Courier New", size: 7, bold: true };
const DATA_FONT_SMALL: Partial<ExcelJS.Font> = { name: "Courier New", size: 6 };

function setCell(ws: ExcelJS.Worksheet, addr: string, value: string, font?: Partial<ExcelJS.Font>) {
  if (!value) return;
  const cell = ws.getCell(addr);
  cell.value = value;
  cell.font = font ?? DATA_FONT;
}

// ── HAWB Excel mapping ──

function fillHawbCells(ws: ExcelJS.Worksheet, input: HawbStampInput) {
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
  const destCity = si.destinations?.city?.toUpperCase() ?? "";
  const toAirport = (shipment?.arrival_airport as string)?.toUpperCase() || destCity;
  const carrierName = (shipment?.carrier_name as string) ?? (courier?.name as string) ?? "";
  const mawbNumber = (shipment?.awb_number as string) ?? "";
  const flightNumber = (shipment?.flight_number as string) ?? "";
  const depDate = shipment?.departure_date as string | null;
  const flightDate = `${flightNumber}${depDate ? ` / ${fmtDate(depDate)}` : ""}`;

  // ── AWB Number (row 1 header + bottom) ──
  setCell(ws, "BB1", hawb.hawb_number, DATA_FONT_BOLD);

  // ── Shipper = Agency (rows 3–6) ──
  setCell(ws, "A3", si.agencies?.name ?? "", DATA_FONT_BOLD);
  setCell(ws, "A4", si.agencies?.address ?? "");
  setCell(ws, "A5", si.agencies?.ruc ? `RUC: ${si.agencies.ruc}` : (si.agencies?.phone ? `Tel: ${si.agencies.phone}` : ""));
  setCell(ws, "A6", si.agencies?.email ?? (si.agencies?.phone ? `Tel: ${si.agencies.phone}` : ""));

  // ── Issued by (row 5, right section) ──
  setCell(ws, "AJ5", carrierName || (courier?.name as string) || "");
  setCell(ws, "AJ6", org?.name ? `Agent: ${org.name}` : "");

  // ── Consignee (rows 8–11) ──
  setCell(ws, "A8", cons?.full_name ?? "", DATA_FONT_BOLD);
  const consAddrParts = [cons?.address_line1, cons?.address_line2].filter(Boolean);
  const consCityLine = [cons?.city, cons?.province, cons?.postal_code].filter(Boolean).join(", ");
  setCell(ws, "A9", consAddrParts[0] ?? "");
  setCell(ws, "A10", consAddrParts[1] ?? consCityLine);
  setCell(ws, "A11", consAddrParts[1] ? consCityLine : (cons?.cedula_ruc ? `ID: ${cons.cedula_ruc}` : ""));

  // ── Agent / Org (rows 13–15) ──
  setCell(ws, "A13", org?.name ?? "", DATA_FONT_BOLD);
  setCell(ws, "A14", si.warehouses?.city ?? "");
  setCell(ws, "A15", si.warehouses?.full_address ?? "", DATA_FONT_SMALL);

  // ── Accounting Information (rows 13–15, right) ──
  setCell(ws, "AJ13", mawbNumber ? `MAWB: ${mawbNumber}` : "");
  setCell(ws, "AJ14", `REF: ${si.si_number}`);
  setCell(ws, "AJ15", settings.hawb_iata_code ? `IATA: ${settings.hawb_iata_code}` : "");

  // ── Airport of Departure (row 18) ──
  setCell(ws, "A18", settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT", DATA_FONT_BOLD);

  // ── Routing (row 21) ──
  setCell(ws, "A21", toAirport, DATA_FONT_BOLD);
  setCell(ws, "E21", carrierName);
  setCell(ws, "K21", mawbNumber);
  setCell(ws, "AJ21", "USD");
  setCell(ws, "AP21", "X", DATA_FONT_BOLD);
  setCell(ws, "AT21", "X", DATA_FONT_BOLD);
  setCell(ws, "AX21", si.total_declared_value_usd != null ? fmt(si.total_declared_value_usd) : "NVD");
  setCell(ws, "BC21", si.total_declared_value_usd != null ? fmt(si.total_declared_value_usd) : "NCV");

  // ── Destination (row 23) ──
  setCell(ws, "E23", destCity, DATA_FONT_BOLD);
  setCell(ws, "R23", flightDate);
  setCell(ws, "AL23", "NIL");

  // ── Handling Information (rows 26–28) ──
  const handlingLines = (si.special_instructions ?? "").split("\n");
  if (handlingLines[0]) setCell(ws, "A26", handlingLines[0]);
  if (handlingLines[1]) setCell(ws, "A27", handlingLines[1]);
  if (handlingLines[2]) setCell(ws, "A28", handlingLines[2]);

  // ── Rate Description (first data row = 32) ──
  const piecesStr = String(hawb.pieces ?? 0);
  setCell(ws, "A32", piecesStr, DATA_FONT_BOLD);
  setCell(ws, "F32", fmt(grossKg), DATA_FONT_BOLD);
  setCell(ws, "K32", "K");
  setCell(ws, "F33", hawb.weight_lb != null ? `${fmt(hawb.weight_lb)} LB` : "");
  setCell(ws, "M32", "G.C.");
  setCell(ws, "V32", fmt(chargeableKg), DATA_FONT_BOLD);

  // Nature and Quantity of Goods
  const goodsLines = buildGoodsLines(items);
  for (let i = 0; i < goodsLines.length && i < 10; i++) {
    setCell(ws, `AZ${32 + i}`, goodsLines[i]!, DATA_FONT_SMALL);
  }

  // ── Bottom totals (row 53) ──
  setCell(ws, "A53", piecesStr, DATA_FONT_BOLD);
  setCell(ws, "F53", fmt(grossKg), DATA_FONT_BOLD);

  // ── Other Charges (box 23) ──
  for (let i = 0; i < charges.length && i < 3; i++) {
    setCell(ws, `AC${55 + i * 3}`, `${charges[i]!.description}: ${fmt(charges[i]!.amount)}`);
  }

  // ── Total Other Charges Due Agent (prepaid) ──
  if (totalOther > 0) {
    setCell(ws, "C64", fmt(totalOther), DATA_FONT_BOLD);
  }

  // ── Total Prepaid ──
  if (totalOther > 0) {
    setCell(ws, "C73", fmt(totalOther), DATA_FONT_BOLD);
  }

  // ── Execution ──
  setCell(ws, "AD78", fmtDate(hawb.created_at));
  setCell(ws, "AP78", settings.hawb_airport_name || "MIAMI");

  // ── Bottom AWB number ──
  setCell(ws, "BB80", hawb.hawb_number, DATA_FONT_BOLD);
}

// ── MAWB Excel mapping ──

function fillMawbCells(ws: ExcelJS.Worksheet, input: MawbStampInput) {
  const { shipment, settings, org } = input;
  const carrier = unwrap(shipment.carriers);
  const destination = unwrap(shipment.destinations);
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
  const toAirport = shipment.arrival_airport?.toUpperCase() || destination?.city?.toUpperCase() || "";
  const carrierName = carrier?.name ?? "";
  const awbNumber = shipment.awb_number ?? "";
  const flightDate = `${shipment.flight_number ?? ""}${shipment.departure_date ? ` / ${fmtDate(shipment.departure_date)}` : ""}`;

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

  setCell(ws, "BB1", awbNumber, DATA_FONT_BOLD);

  setCell(ws, "A3", shipperName, DATA_FONT_BOLD);
  setCell(ws, "A4", shipperAddress);
  setCell(ws, "A5", shipment.warehouses?.phone ? `Tel: ${shipment.warehouses.phone}` : "");

  setCell(ws, "AJ5", carrierName);
  setCell(ws, "AJ6", org?.name ? `Agent: ${org.name}` : "");

  const consigneeName = shipment.consignee_name || shipment.agencies?.name || "";
  const consigneeAddress = shipment.consignee_address || shipment.agencies?.address || "";
  setCell(ws, "A8", consigneeName, DATA_FONT_BOLD);
  setCell(ws, "A9", consigneeAddress);
  setCell(ws, "A10", shipment.agencies?.phone ? `Tel: ${shipment.agencies.phone}` : "");

  setCell(ws, "A13", org?.name ?? "", DATA_FONT_BOLD);
  setCell(ws, "A14", shipment.warehouses?.city ?? "");
  setCell(ws, "A15", shipment.warehouses?.full_address ?? "", DATA_FONT_SMALL);

  setCell(ws, "AJ13", hawbNumbers);
  setCell(ws, "AJ14", `REF: ${shipment.shipment_number}`);
  setCell(ws, "AJ15", settings.hawb_iata_code ? `IATA: ${settings.hawb_iata_code}` : "");

  setCell(ws, "A18", settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT", DATA_FONT_BOLD);

  setCell(ws, "A21", toAirport, DATA_FONT_BOLD);
  setCell(ws, "E21", carrierName);
  setCell(ws, "AJ21", "USD");
  setCell(ws, "AP21", "X", DATA_FONT_BOLD);
  setCell(ws, "AT21", "X", DATA_FONT_BOLD);
  setCell(ws, "AX21", declaredTotal != null ? fmt(declaredTotal) : "NVD");
  setCell(ws, "BC21", declaredTotal != null ? fmt(declaredTotal) : "NCV");

  setCell(ws, "E23", toAirport, DATA_FONT_BOLD);
  setCell(ws, "R23", flightDate);
  setCell(ws, "AL23", "NIL");

  const handlingLines = (shipment.notes ?? "").split("\n");
  if (handlingLines[0]) setCell(ws, "A26", handlingLines[0]);
  if (handlingLines[1]) setCell(ws, "A27", handlingLines[1]);
  if (handlingLines[2]) setCell(ws, "A28", handlingLines[2]);

  const piecesStr = String(totalPieces);
  setCell(ws, "A32", piecesStr, DATA_FONT_BOLD);
  setCell(ws, "F32", fmt(grossKg), DATA_FONT_BOLD);
  setCell(ws, "K32", "K");
  setCell(ws, "F33", totalWeightLb ? `${fmt(totalWeightLb)} LB` : "");
  setCell(ws, "M32", "Q");
  setCell(ws, "V32", fmt(chargeableKg), DATA_FONT_BOLD);

  for (let i = 0; i < goodsLines.length && i < 10; i++) {
    setCell(ws, `AZ${32 + i}`, goodsLines[i]!, DATA_FONT_SMALL);
  }

  setCell(ws, "A53", piecesStr, DATA_FONT_BOLD);
  setCell(ws, "F53", fmt(grossKg), DATA_FONT_BOLD);

  setCell(ws, "AD78", fmtDate(shipment.created_at));
  setCell(ws, "AP78", shipment.warehouses?.city || settings.hawb_airport_name || "MIAMI");

  setCell(ws, "BB80", awbNumber, DATA_FONT_BOLD);
}

// ── Core logic ──

async function fillExcelTemplate(
  fillFn: (ws: ExcelJS.Worksheet) => void,
): Promise<Buffer> {
  const templateBytes = loadTemplate();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBytes as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets[0]!;

  fillFn(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function excelToPdf(xlsxBuffer: Buffer): Promise<Uint8Array> {
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "awb-"));
  const xlsxPath = path.join(tmpDir, "awb.xlsx");
  const pdfPath = path.join(tmpDir, "awb.pdf");

  fs.writeFileSync(xlsxPath, xlsxBuffer);

  // Try common LibreOffice paths
  const soffice =
    fs.existsSync("/usr/bin/soffice") ? "/usr/bin/soffice" :
    fs.existsSync("/usr/local/bin/soffice") ? "/usr/local/bin/soffice" :
    fs.existsSync("/opt/homebrew/bin/soffice") ? "/opt/homebrew/bin/soffice" :
    fs.existsSync("/Applications/LibreOffice.app/Contents/MacOS/soffice") ? "/Applications/LibreOffice.app/Contents/MacOS/soffice" :
    "soffice";

  await new Promise<void>((resolve, reject) => {
    execFile(
      soffice,
      [
        "--headless",
        "--convert-to", "pdf",
        "--outdir", tmpDir,
        xlsxPath,
      ],
      { timeout: 30_000 },
      (err) => {
        if (err) reject(new Error(`LibreOffice conversion failed: ${err.message}`));
        else resolve();
      },
    );
  });

  const pdfBytes = fs.readFileSync(pdfPath);

  // Cleanup
  try {
    fs.unlinkSync(xlsxPath);
    fs.unlinkSync(pdfPath);
    fs.rmdirSync(tmpDir);
  } catch { /* best effort */ }

  return new Uint8Array(pdfBytes);
}

// ── Public API ──

export async function generateHawbExcel(input: HawbStampInput): Promise<Buffer> {
  return fillExcelTemplate((ws) => fillHawbCells(ws, input));
}

export async function generateMawbExcel(input: MawbStampInput): Promise<Buffer> {
  return fillExcelTemplate((ws) => fillMawbCells(ws, input));
}

export async function stampHawbPdf(input: HawbStampInput): Promise<Uint8Array> {
  const xlsx = await generateHawbExcel(input);
  return excelToPdf(xlsx);
}

export async function stampMawbPdf(input: MawbStampInput): Promise<Uint8Array> {
  const xlsx = await generateMawbExcel(input);
  return excelToPdf(xlsx);
}
