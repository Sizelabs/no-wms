export const CARRIERS = [
  "FedEx",
  "UPS",
  "DHL",
  "USPS",
  "Amazon",
  "OnTrac",
  "LaserShip",
  "Otro",
] as const;

export type Carrier = (typeof CARRIERS)[number];
