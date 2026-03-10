/**
 * Build a location barcode: {WAREHOUSE}-{ZONE}-{LOCATION}
 */
export function buildBarcode(warehouseCode: string, zoneCode: string, locationCode: string): string {
  return `${warehouseCode}-${zoneCode}-${locationCode}`;
}

/**
 * Build a structured storage code: {aisle}{rack}-{shelf}{position}
 * e.g. A01-1A, B03-2C
 */
export function buildStorageCode(aisle: string, rack: number, shelf: number, position: number): string {
  const rackStr = String(rack).padStart(2, "0");
  const posStr = String(position).padStart(2, "0");
  return `${aisle}${rackStr}-${shelf}${posStr}`;
}

/**
 * Build a QR payload URL for a location barcode.
 * Requires the app base URL to be passed in (environment-aware).
 */
export function buildQrPayload(barcode: string, appBaseUrl: string): string {
  return `${appBaseUrl}/loc/${barcode}`;
}
