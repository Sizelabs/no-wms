"use client";

import { useState } from "react";

import { MawbList } from "./mawb-list";
import { ReservationList } from "./reservation-list";
import { SacaList } from "./saca-list";

interface ManifestsTabsProps {
  mawbs: Parameters<typeof MawbList>[0]["data"];
  sacas: Parameters<typeof SacaList>[0]["data"];
  reservations: Parameters<typeof ReservationList>[0]["data"];
}

const TABS = [
  { key: "mawbs", label: "MAWBs" },
  { key: "sacas", label: "Sacas" },
  { key: "reservations", label: "Reservaciones" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ManifestsTabs({ mawbs, sacas, reservations }: ManifestsTabsProps) {
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
      {active === "reservations" && <ReservationList data={reservations} />}
    </div>
  );
}
