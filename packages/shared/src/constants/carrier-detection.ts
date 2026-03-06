import type { Carrier } from "./carriers";

// ---------------------------------------------------------------------------
// Carrier detection rules — ordered by specificity (most specific first)
// Each rule has a test function and the carrier it maps to.
// ---------------------------------------------------------------------------

interface CarrierRule {
  carrier: Carrier;
  test: (t: string) => boolean;
}

const rules: CarrierRule[] = [
  // -------------------------------------------------------------------------
  // UPS — always starts with "1Z" followed by 6 chars (shipper) + 2 (service)
  // + 8 (package) + 1 (check digit) = 18 chars total
  // Also matches UPS Mail Innovations: starts with MI, or 9-digit + 2-letter
  // UPS SurePost / i-parcel can start with "JJ" or have mixed formats
  // -------------------------------------------------------------------------
  {
    carrier: "UPS",
    test: (t) =>
      /^1Z[A-Z0-9]{16}$/.test(t) ||
      /^(T|J)\d{10}$/.test(t) ||
      /^MI\d{6,}/.test(t),
  },

  // -------------------------------------------------------------------------
  // Amazon Logistics — "TBA" prefix + 12 digits
  // Also matches "AMZN" and "AD" (Amazon Delivery) prefixes
  // -------------------------------------------------------------------------
  {
    carrier: "Amazon",
    test: (t) =>
      /^TBA\d{12,13}$/.test(t) ||
      t.startsWith("AMZN") ||
      /^AD[A-Z0-9]{10,}$/.test(t),
  },

  // -------------------------------------------------------------------------
  // DHL Express — 10-digit numeric, or JD + 18 digits, or starts with
  // 000, 5-digit (JVG), or waybill JVGL
  // DHL eCommerce — starts with GM, LX, RX, or 420 + ZIP + 9 digits
  // -------------------------------------------------------------------------
  {
    carrier: "DHL",
    test: (t) =>
      /^\d{10,11}$/.test(t) ||
      /^JD\d{18}$/.test(t) ||
      /^JVGL\d{10,}$/.test(t) ||
      /^(GM|LX|RX)[A-Z0-9]{8,}$/.test(t) ||
      (/^0{3,5}\d{7,}$/.test(t) && t.length <= 16),
  },

  // -------------------------------------------------------------------------
  // FedEx — multiple formats:
  // - Express/Ground: 12 or 15 digits
  // - SmartPost: 20-22 digits (starts with 61 or 92)
  // - Door Tag: DT + 12 digits
  // - 96-prefix: 96 + 20 digits (consolidated / returns)
  // -------------------------------------------------------------------------
  {
    carrier: "FedEx",
    test: (t) =>
      /^\d{12}$/.test(t) ||
      /^\d{15}$/.test(t) ||
      /^(61|92)\d{18,20}$/.test(t) ||
      /^DT\d{12}$/.test(t) ||
      /^96\d{20}$/.test(t),
  },

  // -------------------------------------------------------------------------
  // USPS — many formats, key patterns:
  // - 20-22 digits starting with 9 (Priority, Certified, etc.)
  // - 13 chars: 2 letters + 9 digits + 2 letters (international EMS)
  // - Starts with 420 + 5-digit ZIP + 22-digit barcode
  // -------------------------------------------------------------------------
  {
    carrier: "USPS",
    test: (t) =>
      (/^9\d{19,25}$/.test(t) && !(/^(92|61)\d{18,20}$/.test(t))) ||
      /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(t) ||
      /^420\d{5}(9\d{19,21})$/.test(t),
  },

  // -------------------------------------------------------------------------
  // OnTrac — starts with C + 14 digits, or D + 14 digits
  // -------------------------------------------------------------------------
  {
    carrier: "OnTrac",
    test: (t) => /^[CD]\d{14}$/.test(t),
  },

  // -------------------------------------------------------------------------
  // LaserShip — starts with "1LS" or "LX" + 10-12 alphanumeric
  // -------------------------------------------------------------------------
  {
    carrier: "LaserShip",
    test: (t) =>
      /^1LS[A-Z0-9]{10,}$/.test(t) ||
      /^LX\d{10,12}$/.test(t),
  },
];

/**
 * Detect the carrier from a tracking number.
 * Returns the matched Carrier or `null` if no match.
 */
export function detectCarrier(tracking: string): Carrier | null {
  const t = tracking.trim().toUpperCase().replace(/\s+/g, "");
  if (t.length < 6) return null;

  for (const rule of rules) {
    if (rule.test(t)) return rule.carrier;
  }

  return null;
}
