import fs from "fs";
import path from "path";

import { PDFArray, PDFDict, PDFDocument, PDFName, StandardFonts } from "pdf-lib";

import type { HawbStampInput, MawbStampInput } from "./awb-pdf";

// ── Constants ──

const LB_TO_KG = 0.453592;
const INTL_DIM_FACTOR = 166;

// Page height of the fillable HAWB template (720 × 864 pts)
const PAGE_HEIGHT = 864;

// ── Template cache ──

let cachedHawbTemplate: Uint8Array | null = null;

async function loadHawbTemplate(): Promise<Uint8Array> {
  if (cachedHawbTemplate) return cachedHawbTemplate;
  const p = path.join(process.cwd(), "public", "templates", "hawb-fillable.pdf");
  cachedHawbTemplate = fs.readFileSync(p);
  return cachedHawbTemplate;
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
        pieces_count: number;
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

// ── HAWB form field mapping ──
//
// Field names from the fillable PDF mapped to IATA Resolution 600a boxes.
// See Attachment 'B' for box numbering.
//
// ┌─────────────┬──────────────────────────────────────────────────┐
// │ PDF Field    │ IATA Box / Description                          │
// ├─────────────┼──────────────────────────────────────────────────┤
// │ Text_1       │ 1A+1B  HAWB Number (top right)                  │
// │ Text_2       │ 2      Shipper's Name                           │
// │ Text_3       │ 2      Shipper's Address (multiline)            │
// │ Text_4       │ 3      Shipper's Account Number                 │
// │ Text_13      │ 1C     Issued by (carrier name)                 │
// │ Text_5       │ 4      Consignee's Name                         │
// │ Text_6       │ 4      Consignee's Address (multiline)          │
// │ Text_7       │ 5      Consignee's Account Number               │
// │ Text_14      │ 10     Accounting Information                   │
// │ Text_8       │ 9      Airport of Departure                     │
// │ Text_9       │ 11A    To (first carrier destination)            │
// │ Text_10      │ 11B    By First Carrier                         │
// │ Text_11      │        Air Waybill Number (MAWB) in routing     │
// │ Text_15      │ 12     Currency                                 │
// │ Text_16      │ 13     CHGS Code                                │
// │ Text_17      │ 14A    WT/VAL PPD                               │
// │ Text_18      │ 14B    WT/VAL COLL                              │
// │ Text_19      │ 15A    Other PPD                                │
// │ Text_20      │ 15B    Other COLL                               │
// │ Text_21      │ 16     Declared Value for Carriage              │
// │ Text_22      │ 17     Declared Value for Customs               │
// │ Text_12      │ 18     Airport of Destination                   │
// │ Text_23      │ 20     Amount of Insurance                      │
// │ Text_24      │ 21     Handling Information (multiline)         │
// │ Text_25      │ 22A    No. of Pieces                            │
// │ Text_26      │ 22B    Gross Weight                             │
// │ Text_27      │ 22C    kg indicator                             │
// │ Text_28      │ 22C    lb indicator                             │
// │ Text_29      │ 22D    Rate Class / Commodity Item No.          │
// │ Text_30      │ 22F    Chargeable Weight                        │
// │ Text_31      │ 22G    Rate / Charge                            │
// │ Text_32      │ 22H    Total                                    │
// │ Text_33      │ 22I    Nature and Quantity of Goods (multiline) │
// │ Text_34      │ 22J    Total Number of Pieces                   │
// │ Text_35      │ 22K    Total Gross Weight                       │
// │ Text_36      │ 22L    Total Charge                             │
// │ US_Curr_1    │ 24A    Prepaid Weight Charge                    │
// │ US_Curr_2    │ 24B    Collect Weight Charge                    │
// │ Text_37      │ 23     Other Charges line 1                     │
// │ US_Curr_3    │ 25A    Prepaid Valuation Charge                 │
// │ US_Curr_4    │ 25B    Collect Valuation Charge                 │
// │ Text_38      │ 23     Other Charges line 2                     │
// │ US_Curr_5    │ 26A    Prepaid Tax                              │
// │ US_Curr_6    │ 26B    Collect Tax                              │
// │ Text_39      │ 23     Other Charges line 3                     │
// │ US_Curr_7    │ 27A    Total Other Charges Due Agent (Prepaid)  │
// │ US_Curr_8    │ 27B    Total Other Charges Due Agent (Collect)  │
// │ US_Curr_9    │ 28A    Total Other Charges Due Carrier (Prepaid)│
// │ US_Curr_10   │ 28B    Total Other Charges Due Carrier (Collect)│
// │ US_Curr_11   │ 30A    Total Prepaid                            │
// │ US_Curr_12   │ 30B    Total Collect                            │
// │ US_Curr_13   │ 33A    Currency Conversion Rates                │
// │ US_Curr_14   │ 33B    CC Charges in Dest. Currency             │
// │ Signature_1  │ 31     Signature of Shipper or his Agent        │
// │ Date_1       │ 32A    Executed on (Date)                       │
// │ Text_40      │ 32B    At (Place) — part 1                      │
// │ Text_41      │ 32B    At (Place) — part 2                      │
// │ Signature_2  │ 32C    Signature of Issuing Carrier             │
// │ Text_42      │ 1A+1B  HAWB Number (bottom right)               │
// └─────────────┴──────────────────────────────────────────────────┘

function mapHawbToFormFields(input: HawbStampInput): Record<string, string> {
  const { si, settings, org } = input;
  const hawb = si.hawbs?.[0];
  if (!hawb) return {};

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

  // Shipper = agency
  const shipperAddr = [
    si.agencies?.address,
    si.agencies?.ruc ? `RUC: ${si.agencies.ruc}` : null,
    si.agencies?.phone ? `Tel: ${si.agencies.phone}` : null,
    si.agencies?.email,
  ].filter(Boolean).join("\n");

  // Consignee
  const cons = si.consignees;
  const consAddr = [
    cons?.address_line1,
    cons?.address_line2,
    [cons?.city, cons?.province, cons?.postal_code].filter(Boolean).join(", "),
    cons?.cedula_ruc ? `ID: ${cons.cedula_ruc}` : null,
    cons?.phone ? `Tel: ${cons.phone}` : null,
    cons?.email,
  ].filter(Boolean).join("\n");

  const destCity = si.destinations?.city?.toUpperCase() ?? "";
  const toAirport = (shipment?.arrival_airport as string)?.toUpperCase() || destCity;
  const carrierName = (shipment?.carrier_name as string) ?? (courier?.name as string) ?? "";
  const mawbNumber = (shipment?.awb_number as string) ?? "";

  const goodsDesc = buildGoodsDescription(items);
  const piecesStr = String(hawb.pieces ?? 0);

  // Accounting info: MAWB ref + SI number + Agent IATA code
  const acctLines = [
    mawbNumber ? `MAWB: ${mawbNumber}` : null,
    `REF: ${si.si_number}`,
    settings.hawb_iata_code ? `IATA: ${settings.hawb_iata_code}` : null,
    settings.hawb_account_no ? `ACCT: ${settings.hawb_account_no}` : null,
  ].filter(Boolean).join("\n");

  // Other charges descriptions for box 23
  const chargeLines = charges.map((c) => `${c.description}: ${fmt(c.amount)}`);

  return {
    // AWB Number (IATA 1A+1B)
    Text_1: hawb.hawb_number,
    Text_42: hawb.hawb_number,

    // Shipper (IATA 2)
    Text_2: si.agencies?.name ?? "",
    Text_3: shipperAddr,
    Text_4: settings.hawb_shipper_account ?? "",

    // Issued by (IATA 1C) — carrier name + issuing agent name
    Text_13: [
      carrierName || (courier?.name as string) || "",
      org?.name ? `Agent: ${org.name}` : "",
    ].filter(Boolean).join("\n"),

    // Consignee (IATA 4)
    Text_5: cons?.full_name ?? "",
    Text_6: consAddr,
    Text_7: "", // Consignee's Account Number — carrier use only (IATA 2.7.2)

    // Accounting Information (IATA 10)
    Text_14: acctLines,

    // Airport of Departure (IATA 9)
    Text_8: settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT",

    // Routing (IATA 11A, 11B)
    Text_9: toAirport,
    Text_10: carrierName,
    Text_11: mawbNumber,

    // Currency (IATA 12)
    Text_15: "USD",

    // Charges Code (IATA 13) — PP = all charges prepaid by cash
    Text_16: "PP",

    // WT/VAL indicators (IATA 14A/14B, 15A/15B) — "X" in prepaid
    Text_17: "X",
    Text_18: "",
    Text_19: "X",
    Text_20: "",

    // Declared values (IATA 16, 17)
    Text_21: si.total_declared_value_usd != null ? fmt(si.total_declared_value_usd) : "NVD",
    Text_22: si.total_declared_value_usd != null ? fmt(si.total_declared_value_usd) : "NCV",

    // Airport of Destination (IATA 18)
    Text_12: destCity,

    // Amount of Insurance (IATA 20)
    Text_23: "NIL",

    // Handling Information (IATA 21)
    Text_24: si.special_instructions ?? "",

    // Rate Description (IATA 22A–22I)
    Text_25: piecesStr,
    Text_26: hawb.weight_lb != null ? `${fmt(grossKg)}\n${fmt(hawb.weight_lb)} LB` : fmt(grossKg),
    Text_27: "K",   // IATA 2.18.3: K or L on first rating line only
    Text_28: "lb",  // lb unit indicator
    Text_29: "G.C.",
    Text_30: fmt(chargeableKg),
    Text_31: "",
    Text_32: "",
    Text_33: goodsDesc,

    // Bottom totals (IATA 22J, 22K, 22L)
    Text_34: piecesStr,
    Text_35: fmt(grossKg),
    Text_36: "",

    // Charges section — prepaid column (IATA 24A–30A)
    US_Currency_1: "", // Prepaid Weight Charge
    US_Currency_2: "", // Collect Weight Charge
    US_Currency_3: "", // Prepaid Valuation Charge
    US_Currency_4: "", // Collect Valuation Charge
    US_Currency_5: "", // Prepaid Tax
    US_Currency_6: "", // Collect Tax
    US_Currency_7: totalOther > 0 ? fmt(totalOther) : "", // Total Other Charges Due Agent (Prepaid)
    US_Currency_8: "", // Total Other Charges Due Agent (Collect)
    US_Currency_9: "", // Total Other Charges Due Carrier (Prepaid)
    US_Currency_10: "", // Total Other Charges Due Carrier (Collect)
    US_Currency_11: totalOther > 0 ? fmt(totalOther) : "", // Total Prepaid
    US_Currency_12: "", // Total Collect
    US_Currency_13: "", // Currency Conversion Rates
    US_Currency_14: "", // CC Charges in Dest. Currency

    // Other Charges descriptions (IATA 23)
    Text_37: chargeLines[0] ?? "",
    Text_38: chargeLines[1] ?? "",
    Text_39: chargeLines[2] ?? "",

    // Execution (IATA 32A, 32B)
    Date_1: fmtDate(hawb.created_at),
    Text_40: settings.hawb_airport_name || "MIAMI",
    Text_41: "",
  };
}

// ── Fields drawn directly (no form field in the PDF) ──

interface DrawnField {
  x: number;
  y: number; // PDF coords (origin bottom-left)
  text: string;
  size?: number;
  bold?: boolean;
}

function getHawbExtraFields(input: HawbStampInput): DrawnField[] {
  const hawb = input.si.hawbs?.[0];
  const shipment = unwrap(
    hawb?.shipments as Record<string, unknown> | Record<string, unknown>[] | null,
  ) as Record<string, unknown> | null;

  const flightNumber = (shipment?.flight_number as string) ?? "";
  const depDate = shipment?.departure_date as string | null;
  const flightDate = `${flightNumber}${depDate ? ` / ${fmtDate(depDate)}` : ""}`;

  const fields: DrawnField[] = [];

  // Flight/Date — no form field exists for IATA box 19A/19B.
  // Drawn on the destination row, between Airport of Destination and Amount of Insurance.
  // Text_12 is at x=95,screenY=347; Text_23 at x=355,screenY=349.
  // "Flight/Date" label sits at roughly x=235.
  if (flightDate.trim()) {
    fields.push({ x: 240, y: PAGE_HEIGHT - 360, text: flightDate, size: 7.5 });
  }

  return fields;
}

// ── MAWB form field mapping ──
// Reuses the same HAWB fillable PDF template since both follow the IATA AWB layout.

function mapMawbToFormFields(input: MawbStampInput): Record<string, string> {
  const { shipment, settings, org } = input;
  const carrier = unwrap(shipment.carriers);
  const destination = unwrap(shipment.destinations);
  const hawbs = shipment.hawbs ?? [];

  const totalPieces = shipment.total_pieces ?? hawbs.reduce((s, h) => s + (h.pieces ?? 0), 0);
  const totalWeightLb = shipment.total_weight_lb ?? hawbs.reduce((s, h) => s + (h.weight_lb ?? 0), 0);
  const grossKg = lbToKg(totalWeightLb);

  // Volume weight from all items across all HAWBs
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
        allItems.push(item as (typeof allItems)[number]);
      }
    }
  }
  const volumeKg = calcVolumeKg(allItems);
  const chargeableKg = Math.max(grossKg, volumeKg);

  // Declared value sum across HAWBs
  let declaredTotal: number | null = null;
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
    const val = si?.total_declared_value_usd as number | null;
    if (val != null) declaredTotal = (declaredTotal ?? 0) + val;
  }

  const shipperName = shipment.shipper_name || org?.name || "";
  const shipperAddress = shipment.shipper_address || shipment.warehouses?.full_address || "";
  const shipperPhone = shipment.warehouses?.phone ?? "";

  const consigneeName = shipment.consignee_name || shipment.agencies?.name || "";
  const consigneeAddress = shipment.consignee_address || shipment.agencies?.address || "";
  const consigneePhone = shipment.agencies?.phone ?? "";

  const consAddr = [
    consigneeAddress,
    consigneePhone ? `Tel: ${consigneePhone}` : null,
  ].filter(Boolean).join("\n");

  const shipperAddr = [
    shipperAddress,
    shipperPhone ? `Tel: ${shipperPhone}` : null,
  ].filter(Boolean).join("\n");

  const toAirport = shipment.arrival_airport?.toUpperCase() || destination?.city?.toUpperCase() || "";
  const carrierName = carrier?.name ?? "";
  const awbNumber = shipment.awb_number ?? "";

  // Goods description from all HAWBs
  const goodsItems: Parameters<typeof buildGoodsDescription>[0] = [];
  for (const h of hawbs) {
    const si = unwrap(h.shipping_instructions as Record<string, unknown> | Record<string, unknown>[] | null) as Record<string, unknown> | null;
    if (!si?.shipping_instruction_items) continue;
    for (const item of si.shipping_instruction_items as Array<Record<string, unknown>>) {
      goodsItems.push(item as (typeof goodsItems)[number]);
    }
  }
  const goodsDesc = buildGoodsDescription(goodsItems);

  // Accounting: list HAWB numbers
  const hawbNumbers = hawbs.map((h) => h.hawb_number).join(", ");
  const acctLines = [
    hawbNumbers,
    `REF: ${shipment.shipment_number}`,
    settings.hawb_iata_code ? `IATA: ${settings.hawb_iata_code}` : null,
  ].filter(Boolean).join("\n");

  const piecesStr = String(totalPieces);

  return {
    Text_1: awbNumber,
    Text_42: awbNumber,

    Text_2: shipperName,
    Text_3: shipperAddr,
    Text_4: "",

    Text_13: [
      carrierName,
      org?.name ? `Agent: ${org.name}` : "",
    ].filter(Boolean).join("\n"),

    Text_5: consigneeName,
    Text_6: consAddr,
    Text_7: "",

    Text_14: acctLines,

    Text_8: settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT",

    Text_9: toAirport,
    Text_10: carrierName,
    Text_11: "",

    Text_15: "USD",
    Text_16: "PP",
    Text_17: "X",
    Text_18: "",
    Text_19: "X",
    Text_20: "",
    Text_21: declaredTotal != null ? fmt(declaredTotal) : "NVD",
    Text_22: declaredTotal != null ? fmt(declaredTotal) : "NCV",

    Text_12: toAirport,
    Text_23: "NIL",

    Text_24: shipment.notes ?? "",

    Text_25: piecesStr,
    Text_26: fmt(grossKg),
    Text_27: "K",
    Text_28: totalWeightLb ? `${fmt(totalWeightLb)} LB` : "",
    Text_29: "Q",
    Text_30: fmt(chargeableKg),
    Text_31: "",
    Text_32: "",
    Text_33: goodsDesc,

    Text_34: piecesStr,
    Text_35: fmt(grossKg),
    Text_36: "",

    US_Currency_1: "",
    US_Currency_2: "",
    US_Currency_3: "",
    US_Currency_4: "",
    US_Currency_5: "",
    US_Currency_6: "",
    US_Currency_7: "",
    US_Currency_8: "",
    US_Currency_9: "",
    US_Currency_10: "",
    US_Currency_11: "",
    US_Currency_12: "",
    US_Currency_13: "",
    US_Currency_14: "",

    Text_37: "",
    Text_38: "",
    Text_39: "",

    Date_1: fmtDate(shipment.created_at),
    Text_40: shipment.warehouses?.city || settings.hawb_airport_name || "MIAMI",
    Text_41: "",
  };
}

function getMawbExtraFields(input: MawbStampInput): DrawnField[] {
  const { shipment } = input;

  const flightNumber = shipment.flight_number ?? "";
  const depDate = shipment.departure_date;
  const flightDate = `${flightNumber}${depDate ? ` / ${fmtDate(depDate)}` : ""}`;

  const fields: DrawnField[] = [];

  if (flightDate.trim()) {
    fields.push({ x: 240, y: PAGE_HEIGHT - 360, text: flightDate, size: 7.5 });
  }

  return fields;
}

// ── Core fill + flatten logic ──

async function fillAndFlatten(
  formValues: Record<string, string>,
  extraFields: DrawnField[],
): Promise<Uint8Array> {
  const templateBytes = await loadHawbTemplate();
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();
  const page = pdf.getPages()[0]!;

  // Fill all mapped form fields
  for (const [fieldName, value] of Object.entries(formValues)) {
    if (!value) continue;
    try {
      const field = form.getTextField(fieldName);
      field.setText(value);
    } catch {
      // Field doesn't exist in the PDF, skip silently
    }
  }

  // Draw extra fields that have no form field in the PDF
  if (extraFields.length > 0) {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    for (const f of extraFields) {
      page.drawText(f.text, {
        x: f.x,
        y: f.y,
        size: f.size ?? 8,
        font: f.bold ? fontBold : font,
      });
    }
  }

  // Remove signature fields at the low level before flattening.
  // These fields lack appearance streams and crash pdf-lib's flatten()/removeField().
  const acroForm = pdf.catalog.lookup(PDFName.of("AcroForm"), PDFDict);
  if (acroForm) {
    const fieldsArray = acroForm.lookup(PDFName.of("Fields"));
    if (fieldsArray instanceof PDFArray) {
      for (const field of form.getFields()) {
        if (field.constructor.name === "PDFSignature") {
          const ref = field.acroField.ref;
          const idx = fieldsArray.indexOf(ref);
          if (idx !== undefined && idx >= 0) fieldsArray.remove(idx);
        }
      }
    }
  }

  // Re-acquire form after low-level mutation and flatten
  pdf.getForm().flatten();

  return pdf.save();
}

// ── Public API ──

export async function stampHawbPdf(input: HawbStampInput): Promise<Uint8Array> {
  const formValues = mapHawbToFormFields(input);
  const extraFields = getHawbExtraFields(input);
  return fillAndFlatten(formValues, extraFields);
}

export async function stampMawbPdf(input: MawbStampInput): Promise<Uint8Array> {
  const formValues = mapMawbToFormFields(input);
  const extraFields = getMawbExtraFields(input);
  return fillAndFlatten(formValues, extraFields);
}
