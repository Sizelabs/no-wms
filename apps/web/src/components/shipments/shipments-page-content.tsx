"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ShipmentList } from "./shipment-list";
import { UnassignedHouseBillsTable } from "./unassigned-house-bills-table";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Destination {
  id: string;
  city: string;
  country_code: string;
}

interface Carrier {
  id: string;
  code: string;
  name: string;
  modality: string;
}

interface Agency {
  id: string;
  name: string;
  code: string;
}

interface ShipmentsPageContentProps {
  shipments: Parameters<typeof ShipmentList>[0]["data"];
  unassignedHouseBills: Parameters<typeof UnassignedHouseBillsTable>[0]["data"];
  warehouses: Warehouse[];
  destinations: Destination[];
  carriers: Carrier[];
  agencies: Agency[];
  canCreate: boolean;
}

type Tab = "shipments" | "unassigned";

export function ShipmentsPageContent({
  shipments,
  unassignedHouseBills,
  warehouses,
  destinations,
  carriers,
  agencies,
  canCreate,
}: ShipmentsPageContentProps) {
  const { locale } = useParams<{ locale: string }>();
  const [tab, setTab] = useState<Tab>("shipments");

  return (
    <div className="space-y-4">
      {/* Header with tabs and action button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border p-1">
          <TabButton active={tab === "shipments"} onClick={() => setTab("shipments")}>
            Embarques
          </TabButton>
          <TabButton active={tab === "unassigned"} onClick={() => setTab("unassigned")} badge={unassignedHouseBills.length || undefined}>
            Guías sin asignar
          </TabButton>
        </div>
        {canCreate && tab === "shipments" && (
          <Link
            href={`/${locale}/shipments/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Embarque
          </Link>
        )}
      </div>

      {/* Tab content */}
      {tab === "shipments" && <ShipmentList data={shipments} />}
      {tab === "unassigned" && (
        <UnassignedHouseBillsTable
          data={unassignedHouseBills}
          warehouses={warehouses}
          destinations={destinations}
          carriers={carriers}
          agencies={agencies}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
      {badge != null && badge > 0 && (
        <span
          className={`ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
            active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
