export const PACKAGE_TYPES = ["Box", "Envelope", "Tube", "Pallet", "Bag", "Barrel", "Crate", "Other"] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];
