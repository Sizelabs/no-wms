import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import bwipjs from "bwip-js";

// ── Constants ──

const LB_TO_KG = 0.453592;
const INTL_DIM_FACTOR = 166;
const BC = "#333";
const LC = "#444";
const AC = "#1e3a5f";

// ── Types — same shape as awb-stamper.ts ──

export interface HawbStampInput {
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
      couriers:
        | {
            name: string;
            code: string;
            address: string | null;
            city: string | null;
            phone: string | null;
            email: string | null;
          }
        | Array<{ name: string }>
        | null;
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
      shipments:
        | {
            awb_number: string | null;
            carrier_name: string | null;
            flight_number: string | null;
            departure_date: string | null;
            departure_airport: string | null;
            arrival_airport: string | null;
          }
        | Array<Record<string, unknown>>
        | null;
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

export interface MawbStampInput {
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
    carriers:
      | { name: string; code: string }
      | Array<{ name: string; code: string }>
      | null;
    destinations:
      | { city: string; country_code: string }
      | Array<{ city: string; country_code: string }>
      | null;
    agencies: {
      name: string;
      code: string;
      address: string | null;
      phone: string | null;
      email: string | null;
    } | null;
    warehouses: {
      name: string;
      city: string | null;
      full_address: string | null;
      phone: string | null;
    } | null;
    hawbs: Array<{
      hawb_number: string;
      pieces: number | null;
      weight_lb: number | null;
      shipping_instructions:
        | {
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
          }
        | Array<Record<string, unknown>>
        | null;
    }> | null;
  };
  settings: Record<string, string>;
  org: { name: string } | null;
}

// ── Barcode ──

async function genBarcode(text: string): Promise<string> {
  if (!text) return "";
  try {
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: text.replace(/-/g, ""),
      scale: 3,
      height: 10,
      includetext: false,
    });
    return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
  } catch {
    return "";
  }
}

// ── Helpers ──

function lbToKg(lb: number | null): number {
  return lb != null ? lb * LB_TO_KG : 0;
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

function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (val == null) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

type PkgItem = {
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
};

function calcVolumeKg(items: PkgItem[]): number {
  let total = 0;
  for (const item of items) {
    for (const pkg of item.warehouse_receipts?.packages ?? []) {
      if (
        pkg.length_in != null &&
        pkg.width_in != null &&
        pkg.height_in != null
      ) {
        total +=
          ((pkg.length_in * pkg.width_in * pkg.height_in) / INTL_DIM_FACTOR) *
          LB_TO_KG;
      }
    }
  }
  return total;
}

function buildGoods(items: PkgItem[]): { desc: string; dgrText: string } {
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
    const t =
      types.size > 0
        ? Array.from(types).join(", ").toUpperCase()
        : "PACKAGES";
    lines.push(`${totalPkgs} ${t}`);
  }
  if (descs.length > 0) {
    lines.push([...new Set(descs)].join("; ").toUpperCase());
  }

  const dgrText = isDgr
    ? `DANGEROUS GOODS AS PER ATTACHED SHIPPER'S DECLARATION${dgrClasses.size > 0 ? ` - CLASS ${Array.from(dgrClasses).join(", ")}` : ""}`
    : "NO DANGEROUS GOODS AS PER ATTACHED SHIPPER'S DECLARATION";

  return { desc: lines.join("\n"), dgrText };
}

// ── Styles ──

const s = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 24,
    paddingRight: 24,
    fontFamily: "Helvetica",
    fontSize: 8,
  },
  form: { borderWidth: 0.75, borderColor: BC },
  row: { flexDirection: "row" as const },
  bb: { borderBottomWidth: 0.5, borderBottomColor: BC },
  br: { borderRightWidth: 0.5, borderRightColor: BC },
  cell: { paddingVertical: 3, paddingHorizontal: 5 },
  cellSm: { paddingVertical: 2, paddingHorizontal: 3 },
  lbl: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    color: LC,
  },
  val: { fontSize: 8, color: "#000", marginTop: 1 },
  valB: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    marginTop: 1,
  },
  mono: { fontFamily: "Courier" },
  monoB: { fontFamily: "Courier-Bold" },
  sm: { fontSize: 5, color: "#666", lineHeight: 1.3 },
  ctr: { textAlign: "center" as const },
  grayBg: { backgroundColor: "#f0f0f0" },
  blueBg: { backgroundColor: "#eff6ff" },
});

// ── Shared label/value components ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStyle = any;

function L({ children, style }: { children: string; style?: AnyStyle }) {
  return <Text style={style ? [s.lbl, style] : s.lbl}>{children}</Text>;
}

// ── Processed data types ──

interface HawbRender {
  hawbNumber: string;
  barcode: string;
  shipperName: string;
  shipperAddr: string;
  shipperRuc: string;
  shipperPhone: string;
  shipperEmail: string;
  shipperAccount: string;
  consigneeName: string;
  consigneeAddr: string;
  consigneeId: string;
  consigneePhone: string;
  consigneeEmail: string;
  consigneeCasillero: string;
  agentName: string;
  agentCity: string;
  agentAddr: string;
  carrierName: string;
  mawbNumber: string;
  siNumber: string;
  iataCode: string;
  accountNo: string;
  departureAirport: string;
  toAirport: string;
  destAirport: string;
  flightDate: string;
  declCarriage: string;
  declCustoms: string;
  handlingInfo: string;
  pieces: string;
  grossKg: string;
  grossLb: string;
  rateClass: string;
  chargeableWt: string;
  goodsDesc: string;
  dgrText: string;
  charges: { description: string; amount: number }[];
  totalOther: number;
  totalPrepaid: string;
  execDate: string;
  execPlace: string;
}

function processHawb(
  input: HawbStampInput,
  barcode: string,
): HawbRender {
  const { si, settings, org } = input;
  const hawb = si.hawbs?.[0];
  const shipment = unwrap(
    hawb?.shipments as Record<string, unknown> | Record<string, unknown>[] | null,
  ) as Record<string, unknown> | null;
  const courier = unwrap(
    si.agencies?.couriers as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null,
  ) as Record<string, unknown> | null;
  const items = si.shipping_instruction_items ?? [];
  const charges = si.additional_charges ?? [];
  const totalOther = charges.reduce((s, c) => s + (c.amount ?? 0), 0);

  const grossKg = lbToKg(hawb?.weight_lb ?? null);
  const volKg = calcVolumeKg(items);
  const chargeKg = Math.max(grossKg, volKg);

  const cons = si.consignees;
  const consAddr = [
    cons?.address_line1,
    cons?.address_line2,
    cons?.city,
    cons?.province,
    cons?.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  const destCity = si.destinations?.city?.toUpperCase() ?? "";
  const toAirport =
    (shipment?.arrival_airport as string)?.toUpperCase() || destCity;
  const carrierName =
    (shipment?.carrier_name as string) ??
    (courier?.name as string) ??
    "";
  const mawbNumber = (shipment?.awb_number as string) ?? "";
  const flightNumber = (shipment?.flight_number as string) ?? "";
  const depDate = shipment?.departure_date as string | null;

  const { desc, dgrText } = buildGoods(items);

  return {
    hawbNumber: hawb?.hawb_number ?? "",
    barcode,
    shipperName: si.agencies?.name ?? "",
    shipperAddr: si.agencies?.address ?? "",
    shipperRuc: si.agencies?.ruc ?? "",
    shipperPhone: si.agencies?.phone ?? "",
    shipperEmail: si.agencies?.email ?? "",
    shipperAccount: settings.hawb_shipper_account ?? "",
    consigneeName: cons?.full_name ?? "",
    consigneeAddr: consAddr,
    consigneeId: cons?.cedula_ruc ?? "",
    consigneePhone: cons?.phone ?? "",
    consigneeEmail: cons?.email ?? "",
    consigneeCasillero: cons?.casillero ?? "",
    agentName: org?.name ?? "",
    agentCity: si.warehouses?.city ?? "",
    agentAddr: si.warehouses?.full_address ?? "",
    carrierName,
    mawbNumber,
    siNumber: si.si_number,
    iataCode: settings.hawb_iata_code ?? "",
    accountNo: settings.hawb_account_no ?? "",
    departureAirport:
      settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT",
    toAirport,
    destAirport: destCity,
    flightDate: `${flightNumber}${depDate ? ` / ${fmtDate(depDate)}` : ""}`,
    declCarriage:
      si.total_declared_value_usd != null
        ? fmt(si.total_declared_value_usd)
        : "NVD",
    declCustoms:
      si.total_declared_value_usd != null
        ? fmt(si.total_declared_value_usd)
        : "NCV",
    handlingInfo: si.special_instructions ?? "",
    pieces: String(hawb?.pieces ?? 0),
    grossKg: fmt(grossKg),
    grossLb:
      hawb?.weight_lb != null ? `${fmt(hawb.weight_lb)} LB` : "",
    rateClass: "G.C.",
    chargeableWt: fmt(chargeKg),
    goodsDesc: desc,
    dgrText,
    charges,
    totalOther,
    totalPrepaid: totalOther > 0 ? fmt(totalOther) : "",
    execDate: fmtDate(hawb?.created_at ?? null),
    execPlace: settings.hawb_airport_name || "MIAMI",
  };
}

// ── HAWB Document ──

function HawbDoc({ d }: { d: HawbRender }) {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.form}>
          {/* Header */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cell, s.br, { flex: 1 }]}>
              {d.barcode ? (
                <Image
                  src={d.barcode}
                  style={{ width: 160, height: 30 }}
                />
              ) : null}
            </View>
            <View
              style={[
                s.cell,
                { width: 200, alignItems: "flex-end" as const },
              ]}
            >
              <Text
                style={{
                  fontSize: 8,
                  fontFamily: "Helvetica-Bold",
                  textTransform: "uppercase" as const,
                  letterSpacing: 1,
                  color: AC,
                }}
              >
                House Air Waybill
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Courier-Bold",
                  letterSpacing: 0.5,
                  color: AC,
                  marginTop: 2,
                }}
              >
                {d.hawbNumber}
              </Text>
            </View>
          </View>

          {/* Shipper | Not Negotiable */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cell, s.br, { width: "50%" }]}>
              <L>{"Shipper's Name and Address"}</L>
              <Text style={s.valB}>{d.shipperName}</Text>
              {d.shipperAddr ? (
                <Text style={s.val}>{d.shipperAddr}</Text>
              ) : null}
              {d.shipperRuc ? (
                <Text style={s.val}>RUC: {d.shipperRuc}</Text>
              ) : null}
              {d.shipperPhone ? (
                <Text style={s.val}>Tel: {d.shipperPhone}</Text>
              ) : null}
              {d.shipperEmail ? (
                <Text style={s.val}>{d.shipperEmail}</Text>
              ) : null}
              {d.shipperAccount ? (
                <View style={{ marginTop: 4 }}>
                  <L>{"Shipper's Account Number"}</L>
                  <Text style={s.val}>{d.shipperAccount}</Text>
                </View>
              ) : null}
            </View>
            <View style={[s.cell, { width: "50%" }]}>
              <Text style={[s.lbl, s.ctr]}>Not Negotiable</Text>
              <Text style={[s.lbl, s.ctr]}>Air Waybill</Text>
              <Text style={[s.valB, s.ctr, { marginTop: 6 }]}>
                {d.carrierName}
              </Text>
              <Text
                style={[
                  s.sm,
                  { marginTop: 6, textAlign: "justify" as const },
                ]}
              >
                Issued by the named carrier or its agent. It is agreed
                that the goods described herein are accepted in apparent
                good order and condition (except as noted) for carriage
                SUBJECT TO THE CONDITIONS OF CONTRACT ON THE REVERSE
                HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS
                INCLUDING ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC
                CONTRARY INSTRUCTIONS ARE GIVEN HEREON BY THE SHIPPER,
                AND SHIPPER AGREES THAT THE SHIPMENT MAY BE CARRIED VIA
                INTERMEDIATE STOPPING PLACES WHICH THE CARRIER DEEMS
                APPROPRIATE. THE SHIPPER&apos;S ATTENTION IS DRAWN TO
                THE NOTICE CONCERNING CARRIER&apos;S LIMITATION OF
                LIABILITY.
              </Text>
            </View>
          </View>

          {/* Consignee | Agent */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cell, s.br, { width: "50%" }]}>
              <L>{"Consignee's Name and Address"}</L>
              <Text style={s.valB}>{d.consigneeName}</Text>
              {d.consigneeAddr ? (
                <Text style={s.val}>{d.consigneeAddr}</Text>
              ) : null}
              {d.consigneeId ? (
                <Text style={s.val}>ID: {d.consigneeId}</Text>
              ) : null}
              {d.consigneePhone ? (
                <Text style={s.val}>Tel: {d.consigneePhone}</Text>
              ) : null}
              {d.consigneeEmail ? (
                <Text style={s.val}>{d.consigneeEmail}</Text>
              ) : null}
              {d.consigneeCasillero ? (
                <View style={{ marginTop: 4 }}>
                  <L>{"Consignee's Account Number"}</L>
                  <Text style={s.val}>{d.consigneeCasillero}</Text>
                </View>
              ) : null}
            </View>
            <View style={[s.cell, { width: "50%" }]}>
              <L>{"Issuing Carrier's Agent Name and City"}</L>
              <Text style={s.valB}>{d.agentName}</Text>
              <Text style={s.val}>{d.agentCity}</Text>
            </View>
          </View>

          {/* Accounting | IATA + Account */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cell, s.br, { width: "50%" }]}>
              <L>Accounting Information</L>
              <Text style={s.val}>
                {d.mawbNumber ? `MAWB: ${d.mawbNumber}` : "\u00A0"}
              </Text>
              <Text style={s.val}>REF: {d.siNumber}</Text>
            </View>
            <View style={[s.row, { width: "50%" }]}>
              <View style={[s.cell, s.br, { width: "55%" }]}>
                <L>{"Agent's IATA Code"}</L>
                <Text style={s.val}>{d.iataCode}</Text>
              </View>
              <View style={[s.cell, { width: "45%" }]}>
                <L>Account No.</L>
                <Text style={s.val}>{d.accountNo}</Text>
              </View>
            </View>
          </View>

          {/* Airport of Departure */}
          <View style={[s.cell, s.bb]}>
            <L>
              Airport of Departure (Addr. of First Carrier) and
              Requested Routing
            </L>
            <Text style={s.valB}>{d.departureAirport}</Text>
          </View>

          {/* Routing */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cell, s.br, { width: "15%" }]}>
              <L>To</L>
              <Text style={s.valB}>{d.toAirport}</Text>
            </View>
            <View style={[s.cell, s.br, { width: "25%" }]}>
              <L>By First Carrier</L>
              <Text style={s.val}>{d.carrierName}</Text>
            </View>
            <View style={[s.cell, s.br, { width: "25%" }]}>
              <L>Airport of Destination</L>
              <Text style={s.valB}>{d.destAirport}</Text>
            </View>
            <View style={[s.cell, { width: "35%" }]}>
              <L>Flight / Date</L>
              <Text style={s.val}>{d.flightDate}</Text>
            </View>
          </View>

          {/* Currency / Charges / Declared Values */}
          <View style={[s.row, s.bb]}>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Currency</L>
              <Text style={[s.valB, s.ctr]}>USD</Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "7%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>CHGS</L>
              <Text style={[s.val, s.ctr]}>PP</Text>
            </View>
            <View style={[s.cellSm, s.br, { width: "15%" }]}>
              <L style={s.ctr}>WT/VAL</L>
              <View style={[s.row, { marginTop: 1 }]}>
                <View
                  style={{
                    width: "50%",
                    alignItems: "center" as const,
                  }}
                >
                  <Text style={{ fontSize: 5, color: LC }}>PPD</Text>
                  <Text style={s.valB}>X</Text>
                </View>
                <View
                  style={{
                    width: "50%",
                    alignItems: "center" as const,
                  }}
                >
                  <Text style={{ fontSize: 5, color: LC }}>COLL</Text>
                </View>
              </View>
            </View>
            <View style={[s.cellSm, s.br, { width: "15%" }]}>
              <L style={s.ctr}>Other</L>
              <View style={[s.row, { marginTop: 1 }]}>
                <View
                  style={{
                    width: "50%",
                    alignItems: "center" as const,
                  }}
                >
                  <Text style={{ fontSize: 5, color: LC }}>PPD</Text>
                  <Text style={s.valB}>X</Text>
                </View>
                <View
                  style={{
                    width: "50%",
                    alignItems: "center" as const,
                  }}
                >
                  <Text style={{ fontSize: 5, color: LC }}>COLL</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "27.5%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Declared Value for Carriage</L>
              <Text style={[s.valB, s.ctr]}>{d.declCarriage}</Text>
            </View>
            <View
              style={[
                s.cellSm,
                { width: "27.5%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Declared Value for Customs</L>
              <Text style={[s.valB, s.ctr]}>{d.declCustoms}</Text>
            </View>
          </View>

          {/* Handling Information */}
          <View style={[s.cell, s.bb]}>
            <L>Handling Information / SCI</L>
            <Text style={s.val}>{d.handlingInfo || "\u00A0"}</Text>
          </View>

          {/* Rate Description Header */}
          <View style={[s.row, s.bb, s.grayBg]}>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>{"No. of\nPieces\nRCP"}</L>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "12%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Gross Weight</L>
              <Text
                style={[s.lbl, s.ctr, { fontSize: 4.5 }]}
              >
                KG / LB
              </Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>{"Rate\nClass"}</L>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>{"Chargeable\nWeight"}</L>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>{"Rate /\nCharge"}</L>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Total</L>
            </View>
            <View style={[s.cellSm, { width: "42%" }]}>
              <L>
                Nature and Quantity of Goods (incl. Dimensions or
                Volume)
              </L>
            </View>
          </View>

          {/* Rate Description Data */}
          <View style={[s.row, s.bb, { minHeight: 120 }]}>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            >
              <Text style={[s.valB, s.mono]}>{d.pieces}</Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "12%", alignItems: "center" as const },
              ]}
            >
              <Text style={[s.valB, s.mono]}>{d.grossKg}</Text>
              {d.grossLb ? (
                <Text style={[s.val, { fontSize: 6.5 }]}>
                  {d.grossLb}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            >
              <Text style={s.val}>{d.rateClass}</Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            >
              <Text style={[s.valB, s.mono]}>{d.chargeableWt}</Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            />
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            />
            <View style={[s.cellSm, { width: "42%" }]}>
              <Text style={[s.val, s.mono]}>{d.goodsDesc}</Text>
              <Text style={[s.sm, { marginTop: 6 }]}>{d.dgrText}</Text>
            </View>
          </View>

          {/* Other Charges */}
          {d.charges.length > 0 ? (
            <View style={[s.cell, s.bb]}>
              <L>Other Charges</L>
              {d.charges.map((c, i) => (
                <View
                  key={i}
                  style={[
                    s.row,
                    {
                      justifyContent: "space-between" as const,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.val,
                      { textTransform: "uppercase" as const },
                    ]}
                  >
                    {c.description}
                  </Text>
                  <Text style={[s.val, s.mono]}>
                    {c.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
              <View
                style={[
                  s.row,
                  {
                    justifyContent: "space-between" as const,
                    borderTopWidth: 0.5,
                    borderTopColor: BC,
                    marginTop: 2,
                    paddingTop: 2,
                  },
                ]}
              >
                <Text style={s.valB}>
                  TOTAL OTHER CHARGES DUE AGENT
                </Text>
                <Text style={[s.valB, s.mono]}>
                  {d.totalOther.toFixed(2)}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Total Prepaid | Total Collect */}
          <View style={[s.row, s.bb, s.grayBg]}>
            <View
              style={[
                s.cell,
                s.br,
                { width: "50%", alignItems: "center" as const },
              ]}
            >
              <L>Total Prepaid</L>
              <Text style={[s.valB, s.mono]}>{d.totalPrepaid}</Text>
            </View>
            <View
              style={[
                s.cell,
                { width: "50%", alignItems: "center" as const },
              ]}
            >
              <L>Total Collect</L>
            </View>
          </View>

          {/* Signatures */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cell, s.br, { width: "50%" }]}>
              <L>Signature of Shipper or his Agent</L>
              <Text style={[s.valB, { marginTop: 8 }]}>
                {d.agentName}
              </Text>
              <Text style={[s.val, { marginTop: 1 }]}>
                {d.agentAddr}
              </Text>
              {d.agentCity ? (
                <Text style={s.val}>{d.agentCity}</Text>
              ) : null}
            </View>
            <View style={[s.cell, { width: "50%" }]}>
              <L>Executed on (Date)</L>
              <Text style={s.val}>{d.execDate}</Text>
              <L style={{ marginTop: 4 }}>at (Place)</L>
              <Text style={s.val}>{d.execPlace}</Text>
              <L style={{ marginTop: 4 }}>
                Signature of Issuing Carrier or its Agent
              </L>
              <Text style={[s.valB, { marginTop: 4 }]}>
                {d.agentName}
              </Text>
            </View>
          </View>

          {/* Copy designation */}
          <View
            style={[
              s.cell,
              s.blueBg,
              { alignItems: "center" as const, paddingVertical: 4 },
            ]}
          >
            <Text
              style={{
                fontSize: 8,
                fontFamily: "Helvetica-Bold",
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                color: "#2563eb",
              }}
            >
              Original 3 (for Shipper)
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ── MAWB data processing ──

interface MawbRender {
  awbNumber: string;
  barcode: string;
  shipperName: string;
  shipperAddr: string;
  shipperPhone: string;
  consigneeName: string;
  consigneeAddr: string;
  consigneePhone: string;
  agentName: string;
  agentCity: string;
  agentAddr: string;
  carrierName: string;
  carrierCode: string;
  hawbNumbers: string;
  shipmentNumber: string;
  iataCode: string;
  accountNo: string;
  departureAirport: string;
  toAirport: string;
  flightDate: string;
  declCarriage: string;
  declCustoms: string;
  handlingInfo: string;
  pieces: string;
  grossKg: string;
  grossLb: string;
  rateClass: string;
  chargeableWt: string;
  goodsDesc: string;
  dgrText: string;
  totalPrepaid: string;
  execDate: string;
  execPlace: string;
}

function processMawb(
  input: MawbStampInput,
  barcode: string,
): MawbRender {
  const { shipment, settings, org } = input;
  const carrier = unwrap(shipment.carriers);
  const destination = unwrap(shipment.destinations);
  const hawbs = shipment.hawbs ?? [];

  const totalPieces =
    shipment.total_pieces ??
    hawbs.reduce((s, h) => s + (h.pieces ?? 0), 0);
  const totalWeightLb =
    shipment.total_weight_lb ??
    hawbs.reduce((s, h) => s + (h.weight_lb ?? 0), 0);
  const grossKg = lbToKg(totalWeightLb);

  const allItems: PkgItem[] = [];
  for (const h of hawbs) {
    const si = unwrap(
      h.shipping_instructions as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | null,
    ) as Record<string, unknown> | null;
    if (si?.shipping_instruction_items) {
      for (const item of si.shipping_instruction_items as Array<
        Record<string, unknown>
      >) {
        allItems.push(item as PkgItem);
      }
    }
  }
  const volKg = calcVolumeKg(allItems);
  const chargeKg = Math.max(grossKg, volKg);

  let declTotal: number | null = null;
  for (const h of hawbs) {
    const si = unwrap(
      h.shipping_instructions as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | null,
    ) as Record<string, unknown> | null;
    const val = si?.total_declared_value_usd as number | null;
    if (val != null) declTotal = (declTotal ?? 0) + val;
  }

  const { desc, dgrText } = buildGoods(allItems);
  const toAirport =
    shipment.arrival_airport?.toUpperCase() ||
    destination?.city?.toUpperCase() ||
    "";

  return {
    awbNumber: shipment.awb_number ?? "",
    barcode,
    shipperName:
      shipment.shipper_name || org?.name || "",
    shipperAddr:
      shipment.shipper_address ||
      shipment.warehouses?.full_address ||
      "",
    shipperPhone: shipment.warehouses?.phone ?? "",
    consigneeName:
      shipment.consignee_name || shipment.agencies?.name || "",
    consigneeAddr:
      shipment.consignee_address || shipment.agencies?.address || "",
    consigneePhone: shipment.agencies?.phone ?? "",
    agentName: org?.name ?? "",
    agentCity: shipment.warehouses?.city ?? "",
    agentAddr: shipment.warehouses?.full_address ?? "",
    carrierName: carrier?.name ?? "",
    carrierCode: carrier?.code ?? "",
    hawbNumbers: hawbs.map((h) => h.hawb_number).join(", "),
    shipmentNumber: shipment.shipment_number,
    iataCode: settings.hawb_iata_code ?? "",
    accountNo: settings.hawb_account_no ?? "",
    departureAirport:
      settings.hawb_airport_name || "MIAMI INTERNATIONAL AIRPORT",
    toAirport,
    flightDate: `${shipment.flight_number ?? ""}${shipment.departure_date ? ` / ${fmtDate(shipment.departure_date)}` : ""}`,
    declCarriage:
      declTotal != null ? fmt(declTotal) : "NVD",
    declCustoms:
      declTotal != null ? fmt(declTotal) : "NCV",
    handlingInfo: shipment.notes ?? "",
    pieces: String(totalPieces),
    grossKg: fmt(grossKg),
    grossLb: totalWeightLb ? `${fmt(totalWeightLb)} LB` : "",
    rateClass: "Q",
    chargeableWt: fmt(chargeKg),
    goodsDesc: desc,
    dgrText,
    totalPrepaid: "",
    execDate: fmtDate(shipment.created_at),
    execPlace:
      shipment.warehouses?.city ||
      settings.hawb_airport_name ||
      "MIAMI",
  };
}

// ── MAWB Document ──

function MawbDoc({ d }: { d: MawbRender }) {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.form}>
          {/* Header: Shipper (left, tall) | Not Negotiable + AWB (right) */}
          <View style={[s.row, s.bb]}>
            {/* Left: Shipper spans full height */}
            <View style={[s.br, { width: "50%" }]}>
              <View style={[s.cell]}>
                <L>{"Shipper's Name and Address"}</L>
                <Text style={[s.valB, { marginTop: 2 }]}>
                  {d.shipperName}
                </Text>
                {d.shipperAddr ? (
                  <Text style={s.val}>{d.shipperAddr}</Text>
                ) : null}
                {d.shipperPhone ? (
                  <Text style={s.val}>Tel: {d.shipperPhone}</Text>
                ) : null}
              </View>
            </View>
            {/* Right: Not Negotiable + AWB + barcode */}
            <View style={{ width: "50%" }}>
              <View style={[s.cell, s.bb]}>
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7 }}>
                      Not Negotiable
                    </Text>
                    <Text style={{ fontSize: 7 }}>Air Waybill</Text>
                    <Text style={{ fontSize: 7, marginTop: 2 }}>
                      Issued by
                    </Text>
                    <Text style={[s.valB, { marginTop: 1 }]}>
                      {d.carrierName}
                    </Text>
                  </View>
                  <View
                    style={{
                      alignItems: "flex-end" as const,
                    }}
                  >
                    {d.barcode ? (
                      <Image
                        src={d.barcode}
                        style={{ width: 140, height: 28 }}
                      />
                    ) : null}
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Courier-Bold",
                        letterSpacing: 0.5,
                        marginTop: 2,
                      }}
                    >
                      {d.awbNumber}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[s.cell]}>
                <Text style={{ fontSize: 6 }}>
                  Copies 1, 2 and 3 of this Air Waybill are originals
                  and have the same validity
                </Text>
              </View>
            </View>
          </View>

          {/* Consignee | Legal text */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cell, s.br, { width: "50%" }]}>
              <L>{"Consignee's Name and Address"}</L>
              <Text style={[s.valB, { marginTop: 2 }]}>
                {d.consigneeName}
              </Text>
              {d.consigneeAddr ? (
                <Text style={s.val}>{d.consigneeAddr}</Text>
              ) : null}
              {d.consigneePhone ? (
                <Text style={s.val}>Tel: {d.consigneePhone}</Text>
              ) : null}
            </View>
            <View style={[s.cell, { width: "50%" }]}>
              <Text
                style={[
                  s.sm,
                  { textAlign: "justify" as const, fontSize: 5.5 },
                ]}
              >
                It is agreed that the goods described herein are
                accepted in apparent good order and condition (except as
                noted) for carriage SUBJECT TO THE CONDITIONS OF
                CONTRACT ON THE REVERSE HEREOF. ALL GOODS MAY BE
                CARRIED BY ANY OTHER MEANS INCLUDING ROAD OR ANY OTHER
                CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN
                HEREON BY THE SHIPPER, AND SHIPPER AGREES THAT THE
                SHIPMENT MAY BE CARRIED VIA INTERMEDIATE STOPPING
                PLACES WHICH THE CARRIER DEEMS APPROPRIATE. THE
                SHIPPER&apos;S ATTENTION IS DRAWN TO THE NOTICE
                CONCERNING CARRIER&apos;S LIMITATION OF LIABILITY.
                Shipper may increase such limitation of liability by
                declaring a higher value for carriage and paying a
                supplemental charge if required.
              </Text>
            </View>
          </View>

          {/* Agent (left) | Accounting Info (right, spans 2 rows) */}
          <View style={[s.row, s.bb]}>
            <View style={[s.br, { width: "50%" }]}>
              {/* Agent Name */}
              <View style={[s.cell, s.bb]}>
                <L>{"Issuing Carrier's Agent Name and City"}</L>
                <Text style={[s.valB, { marginTop: 1 }]}>
                  {d.agentName}
                </Text>
                <Text style={s.val}>{d.agentCity}</Text>
              </View>
              {/* IATA + Account */}
              <View style={s.row}>
                <View style={[s.cell, s.br, { width: "55%" }]}>
                  <L>{"Agent's IATA Code"}</L>
                  <Text style={s.val}>{d.iataCode}</Text>
                </View>
                <View style={[s.cell, { width: "45%" }]}>
                  <L>Account No.</L>
                  <Text style={s.val}>{d.accountNo}</Text>
                </View>
              </View>
            </View>
            {/* Accounting Info */}
            <View style={[s.cell, { width: "50%" }]}>
              <L>Accounting Information</L>
              <Text style={[s.val, { marginTop: 2 }]}>
                {d.hawbNumbers}
              </Text>
              <Text style={s.val}>REF: {d.shipmentNumber}</Text>
            </View>
          </View>

          {/* Departure | Reference */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cell, s.br, { width: "50%" }]}>
              <L>
                Airport of Departure (Addr. of First Carrier) and
                Requested Routing
              </L>
              <Text style={s.valB}>{d.departureAirport}</Text>
            </View>
            <View style={[s.row, { width: "50%" }]}>
              <View style={[s.cell, s.br, { width: "60%" }]}>
                <L>Reference Number</L>
                <Text style={s.val}>{d.shipmentNumber}</Text>
              </View>
              <View style={[s.cell, { width: "40%" }]}>
                <L>Optional Shipping Information</L>
              </View>
            </View>
          </View>

          {/* Routing row */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "6%" }]}>
              <L>To</L>
              <Text style={s.valB}>{d.toAirport}</Text>
            </View>
            <View style={[s.cellSm, s.br, { width: "19%" }]}>
              <L>By First Carrier</L>
              <Text style={s.val}>{d.carrierName}</Text>
            </View>
            <View style={[s.cellSm, s.br, { width: "5%" }]}>
              <L>to</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "5%" }]}>
              <L>by</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "5%" }]}>
              <L>to</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "5%" }]}>
              <L>by</L>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "5%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Currency</L>
              <Text style={[s.valB, s.ctr]}>USD</Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "4%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>CHGS</L>
              <Text style={[s.val, s.ctr]}>PP</Text>
            </View>
            <View style={[s.cellSm, s.br, { width: "8%" }]}>
              <L style={s.ctr}>WT/VAL</L>
              <View style={[s.row, { marginTop: 1 }]}>
                <View
                  style={{
                    width: "50%",
                    alignItems: "center" as const,
                  }}
                >
                  <Text style={{ fontSize: 4.5, color: LC }}>PPD</Text>
                  <Text style={s.valB}>X</Text>
                </View>
                <View
                  style={{
                    width: "50%",
                    alignItems: "center" as const,
                  }}
                >
                  <Text style={{ fontSize: 4.5, color: LC }}>COLL</Text>
                </View>
              </View>
            </View>
            <View style={[s.cellSm, s.br, { width: "8%" }]}>
              <L style={s.ctr}>Other</L>
              <View style={[s.row, { marginTop: 1 }]}>
                <View
                  style={{
                    width: "50%",
                    alignItems: "center" as const,
                  }}
                >
                  <Text style={{ fontSize: 4.5, color: LC }}>PPD</Text>
                  <Text style={s.valB}>X</Text>
                </View>
                <View
                  style={{
                    width: "50%",
                    alignItems: "center" as const,
                  }}
                >
                  <Text style={{ fontSize: 4.5, color: LC }}>COLL</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "15%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Declared Value for Carriage</L>
              <Text style={[s.valB, s.ctr]}>{d.declCarriage}</Text>
            </View>
            <View
              style={[
                s.cellSm,
                { width: "15%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Declared Value for Customs</L>
              <Text style={[s.valB, s.ctr]}>{d.declCustoms}</Text>
            </View>
          </View>

          {/* Destination row */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "25%" }]}>
              <L>Airport of Destination</L>
              <Text style={s.valB}>{d.toAirport}</Text>
            </View>
            <View style={[s.cellSm, s.br, { width: "15%" }]}>
              <L>Flight / Date</L>
              <Text style={s.val}>{d.flightDate}</Text>
            </View>
            <View style={[s.cellSm, s.br, { width: "15%" }]}>
              <L>For Carrier Use Only</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "10%" }]}>
              <L>Amount of Insurance</L>
            </View>
            <View style={[s.cellSm, { width: "35%" }]}>
              <Text style={s.sm}>
                INSURANCE - If carrier offers insurance, and such
                insurance is requested in accordance with the conditions
                thereof, indicate amount to be insured in figures in box
                marked &quot;Amount of Insurance.&quot;
              </Text>
            </View>
          </View>

          {/* Handling + SCI */}
          <View style={[s.cell, s.bb, { minHeight: 36 }]}>
            <L>Handling Information</L>
            <Text style={s.val}>{d.handlingInfo || "\u00A0"}</Text>
          </View>

          {/* Rate Description Header */}
          <View style={[s.row, s.bb, s.grayBg]}>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "6%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>{"No. of\nPieces\nRCP"}</L>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Gross Weight</L>
              <Text style={[s.lbl, s.ctr, { fontSize: 4.5 }]}>
                KG / LB
              </Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>{"Rate\nClass"}</L>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>{"Chargeable\nWeight"}</L>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>{"Rate /\nCharge"}</L>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            >
              <L style={s.ctr}>Total</L>
            </View>
            <View style={[s.cellSm, { width: "50%" }]}>
              <L>
                Nature and Quantity of Goods (incl. Dimensions or
                Volume)
              </L>
            </View>
          </View>

          {/* Rate Description Data */}
          <View style={[s.row, s.bb, { minHeight: 180 }]}>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "6%", alignItems: "center" as const },
              ]}
            >
              <Text style={[s.valB, s.mono]}>{d.pieces}</Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            >
              <Text style={[s.valB, s.mono]}>{d.grossKg}</Text>
              {d.grossLb ? (
                <Text style={[s.val, { fontSize: 6.5 }]}>
                  {d.grossLb}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            >
              <Text style={s.val}>{d.rateClass}</Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "10%", alignItems: "center" as const },
              ]}
            >
              <Text style={[s.valB, s.mono]}>{d.chargeableWt}</Text>
            </View>
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            />
            <View
              style={[
                s.cellSm,
                s.br,
                { width: "8%", alignItems: "center" as const },
              ]}
            />
            <View style={[s.cellSm, { width: "50%" }]}>
              <Text style={[s.val, s.mono]}>{d.goodsDesc}</Text>
              <Text style={[s.sm, { marginTop: 6 }]}>{d.dgrText}</Text>
            </View>
          </View>

          {/* Charges section */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "13%" }]}>
              <L>Prepaid</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "17%" }]}>
              <L>Weight Charge</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "12%" }]}>
              <L>Collect</L>
            </View>
            <View style={[s.cellSm, { width: "58%" }]}>
              <L>Other Charges</L>
            </View>
          </View>
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "13%" }]} />
            <View style={[s.cellSm, s.br, { width: "17%" }]}>
              <L>Valuation Charge</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "12%" }]} />
            <View style={[s.cellSm, { width: "58%" }]} />
          </View>
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "13%" }]} />
            <View style={[s.cellSm, s.br, { width: "17%" }]}>
              <L>Tax</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "12%" }]} />
            <View style={[s.cellSm, { width: "58%" }]} />
          </View>
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "13%" }]} />
            <View style={[s.cellSm, s.br, { width: "17%" }]}>
              <L>Total Other Charges Due Agent</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "12%" }]} />
            <View style={[s.cellSm, { width: "58%" }]}>
              <Text style={s.sm}>
                Shipper certifies that the particulars on the face
                hereof are correct and that insofar as any part of the
                consignment contains dangerous goods, such part is
                properly described by name and is in proper condition
                for carriage by air according to the applicable
                Dangerous Goods Regulations.
              </Text>
            </View>
          </View>
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "13%" }]} />
            <View style={[s.cellSm, s.br, { width: "17%" }]}>
              <L>Total Other Charges Due Carrier</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "12%" }]} />
            <View style={[s.cellSm, { width: "58%" }]}>
              <View
                style={{
                  borderTopWidth: 0.5,
                  borderTopColor: BC,
                  borderTopStyle: "dashed" as const,
                  paddingTop: 3,
                }}
              >
                <L>Signature of Shipper or his Agent</L>
                <Text style={[s.valB, { marginTop: 2 }]}>
                  {d.agentName}
                </Text>
              </View>
            </View>
          </View>

          {/* Total Prepaid / Collect */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "21%" }]}>
              <L>Total Prepaid</L>
              <Text style={s.val}>{d.totalPrepaid}</Text>
            </View>
            <View style={[s.cellSm, s.br, { width: "21%" }]}>
              <L>Total Collect</L>
            </View>
            <View style={[s.cellSm, { width: "58%" }]} />
          </View>

          {/* Currency / CC */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "21%" }]}>
              <L>Currency Conversion Rates</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "21%" }]}>
              <L>CC Charges in Dest. Currency</L>
            </View>
            <View style={[s.cellSm, { width: "58%" }]} />
          </View>

          {/* Executed on / Signature */}
          <View style={[s.row, s.bb]}>
            <View style={[s.br, { width: "42%" }]} />
            <View
              style={{
                width: "58%",
                borderTopWidth: 0.5,
                borderTopColor: BC,
                borderTopStyle: "dashed" as const,
              }}
            >
              <View style={s.row}>
                <View style={[s.cellSm, s.br, { width: "30%" }]}>
                  <L>Executed on (date)</L>
                  <Text style={s.val}>{d.execDate}</Text>
                </View>
                <View style={[s.cellSm, s.br, { width: "30%" }]}>
                  <L>at (place)</L>
                  <Text style={s.val}>{d.execPlace}</Text>
                </View>
                <View style={[s.cellSm, { width: "40%" }]}>
                  <L>Signature of Issuing Carrier or its Agent</L>
                  <Text style={[s.valB, { marginTop: 1 }]}>
                    {d.agentName}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* For Carrier Use at Destination */}
          <View style={[s.row, s.bb]}>
            <View style={[s.cellSm, s.br, { width: "21%" }]}>
              <L>{"For Carrier's Use only at Destination"}</L>
            </View>
            <View style={[s.cellSm, s.br, { width: "21%" }]}>
              <L>Charges at Destination</L>
            </View>
            <View style={[s.cellSm, { width: "58%" }]}>
              <L>Total Collect Charges</L>
            </View>
          </View>

          {/* Copy designation */}
          <View
            style={[
              s.cell,
              s.blueBg,
              { alignItems: "center" as const, paddingVertical: 4 },
            ]}
          >
            <Text
              style={{
                fontSize: 8,
                fontFamily: "Helvetica-Bold",
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                color: "#2563eb",
              }}
            >
              Original 3 (for Shipper)
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ── Public API ──

export async function stampHawbPdf(
  input: HawbStampInput,
): Promise<Uint8Array> {
  const hawbNumber = input.si.hawbs?.[0]?.hawb_number ?? "";
  const barcode = await genBarcode(hawbNumber);
  const data = processHawb(input, barcode);
  const buffer = await renderToBuffer(<HawbDoc d={data} />);
  return new Uint8Array(buffer);
}

export async function stampMawbPdf(
  input: MawbStampInput,
): Promise<Uint8Array> {
  const awbNumber = input.shipment.awb_number ?? "";
  const barcode = await genBarcode(awbNumber);
  const data = processMawb(input, barcode);
  const buffer = await renderToBuffer(<MawbDoc d={data} />);
  return new Uint8Array(buffer);
}
