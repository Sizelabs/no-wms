"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ShipmentList } from "./shipment-list";

interface ShipmentsPageContentProps {
  shipments: Parameters<typeof ShipmentList>[0]["data"];
  canCreate: boolean;
}

export function ShipmentsPageContent({
  shipments,
  canCreate,
}: ShipmentsPageContentProps) {
  const { locale } = useParams<{ locale: string }>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {canCreate && (
          <Link
            href={`/${locale}/shipments/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Embarque
          </Link>
        )}
      </div>

      <ShipmentList data={shipments} />
    </div>
  );
}
