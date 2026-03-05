"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { HistoryPackageTable } from "@/components/history/history-package-table";
import { HistoryWrTable } from "@/components/history/history-wr-table";

interface HistoryTabsProps {
  wrData: unknown[];
  wrCount: number;
  pkgData: unknown[];
  pkgCount: number;
  locale: string;
  agencies: Array<{ id: string; name: string; code: string }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  activeTab: string;
}

export function HistoryTabs({
  wrData,
  wrCount,
  pkgData,
  pkgCount,
  locale,
  agencies,
  warehouses,
  activeTab,
}: HistoryTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      params.delete("offset");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const isReceipts = activeTab !== "packages";

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200">
        <div className="-mb-px flex gap-1">
          <button
            onClick={() => setTab("receipts")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isReceipts
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Recibos ({wrCount})
          </button>
          <button
            onClick={() => setTab("packages")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              !isReceipts
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Paquetes ({pkgCount})
          </button>
        </div>
      </div>

      {isReceipts ? (
        <HistoryWrTable
          data={wrData}
          count={wrCount}
          locale={locale}
          agencies={agencies}
          warehouses={warehouses}
        />
      ) : (
        <HistoryPackageTable
          data={pkgData}
          count={pkgCount}
          locale={locale}
          agencies={agencies}
          warehouses={warehouses}
        />
      )}
    </div>
  );
}
