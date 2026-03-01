"use client";

import { useState } from "react";

import { MawbList } from "./mawb-list";
import { PickupList } from "./pickup-list";
import { ReservationCreateForm } from "./reservation-create-form";
import { ReservationList } from "./reservation-list";
import { SacaList } from "./saca-list";
import { TransferList } from "./transfer-list";

interface ManifestsTabsProps {
  mawbs: Parameters<typeof MawbList>[0]["data"];
  sacas: Parameters<typeof SacaList>[0]["data"];
  reservations: Parameters<typeof ReservationList>[0]["data"];
  transfers?: Parameters<typeof TransferList>[0]["data"];
  pickups?: Parameters<typeof PickupList>[0]["data"];
  agencies?: Array<{ id: string; name: string; code: string }>;
}

const TABS = [
  { key: "mawbs", label: "MAWBs" },
  { key: "sacas", label: "Sacas" },
  { key: "reservations", label: "Reservaciones" },
  { key: "transfers", label: "Transferencias" },
  { key: "pickups", label: "Retiros" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ManifestsTabs({ mawbs, sacas, reservations, transfers = [], pickups = [], agencies = [] }: ManifestsTabsProps) {
  const [active, setActive] = useState<TabKey>("mawbs");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-sm font-medium ${
              active === tab.key
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "mawbs" && <MawbList data={mawbs} />}
      {active === "sacas" && <SacaList data={sacas} />}
      {active === "reservations" && (
        <div className="space-y-4">
          <ReservationCreateForm />
          <ReservationList data={reservations} />
        </div>
      )}
      {active === "transfers" && <TransferList data={transfers} agencies={agencies} />}
      {active === "pickups" && <PickupList data={pickups} />}
    </div>
  );
}
