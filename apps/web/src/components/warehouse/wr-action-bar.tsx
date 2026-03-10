"use client";

import type { WorkOrderType } from "@no-wms/shared/constants/work-order-types";
import {
  WO_MAX_WRS,
  WO_MIN_WRS,
  WO_TYPE_DESCRIPTIONS,
  WORK_ORDER_TYPE_LABELS,
  WR_ACTION_BAR_SERVICES,
} from "@no-wms/shared/constants/work-order-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { AbandonFlow } from "./service-flows/abandon-flow";
import { ConsolidateFlow } from "./service-flows/consolidate-flow";
import { DivideFlow } from "./service-flows/divide-flow";
import { GroupFlow } from "./service-flows/group-flow";
import { InspectionFlow } from "./service-flows/inspection-flow";
import { InventoryFlow } from "./service-flows/inventory-flow";
import { PhotosFlow } from "./service-flows/photos-flow";
import { RepackFlow } from "./service-flows/repack-flow";
import { ReturnFlow } from "./service-flows/return-flow";
import type { WrSummaryItem } from "./service-flows/service-flow-wrapper";
import { ShipFlow } from "./service-flows/ship-flow";
import { SpecialRequestFlow } from "./service-flows/special-request-flow";

const ICONS: Partial<Record<WorkOrderType, string>> = {
  ship: "📦",
  consolidate: "📋",
  group: "🔗",
  photos: "📷",
  repack: "🔄",
  divide: "✂️",
  inspection: "🔍",
  inventory_count: "📊",
  return: "↩️",
  special_request: "⚙️",
  abandon: "🗑️",
};

interface WrActionBarProps {
  selectedWrs: WrSummaryItem[];
  warehouseId: string;
  agencyId: string;
  onClearSelection: () => void;
  wrsWithActiveWo: number;
}

function getDisabledReason(type: WorkOrderType, count: number): string | null {
  const min = WO_MIN_WRS[type];
  const max = WO_MAX_WRS[type];
  if (min && count < min) return `Requiere al menos ${min} recibo(s)`;
  if (max && count > max) return `Requiere exactamente ${max} recibo(s)`;
  return null;
}

export function WrActionBar({
  selectedWrs,
  warehouseId,
  agencyId,
  onClearSelection,
  wrsWithActiveWo,
}: WrActionBarProps) {
  const [activeFlow, setActiveFlow] = useState<WorkOrderType | null>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cutoffIndex, setCutoffIndex] = useState(WR_ACTION_BAR_SERVICES.length);
  const count = selectedWrs.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Slide-up animation: flip mounted after first render
  useEffect(() => {
    if (count > 0) {
      // requestAnimationFrame ensures the translate-y-full frame is painted first
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [count]);

  // ResizeObserver: measure which buttons fit
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const containerWidth = container.offsetWidth;
      // Reserve space for overflow button (~56px for "+N" pill)
      const overflowBtnWidth = 56;
      let usedWidth = 0;
      let newCutoff = WR_ACTION_BAR_SERVICES.length;

      for (let i = 0; i < buttonRefs.current.length; i++) {
        const btn = buttonRefs.current[i];
        if (!btn) continue;
        const btnWidth = btn.offsetWidth + 6; // 6px for gap-1.5
        if (usedWidth + btnWidth > containerWidth - overflowBtnWidth) {
          newCutoff = i;
          break;
        }
        usedWidth += btnWidth;
      }

      // If all buttons fit without the overflow reserve, show them all
      if (newCutoff === WR_ACTION_BAR_SERVICES.length) {
        let total = 0;
        for (let i = 0; i < buttonRefs.current.length; i++) {
          const btn = buttonRefs.current[i];
          if (!btn) continue;
          total += btn.offsetWidth + 6;
        }
        if (total <= containerWidth) {
          setCutoffIndex(WR_ACTION_BAR_SERVICES.length);
          return;
        }
      }

      setCutoffIndex(newCutoff);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    // Initial measurement after buttons render
    measure();

    return () => ro.disconnect();
  }, [count]); // re-attach when selection changes (bar appears/disappears)

  const handleCloseFlow = useCallback(() => {
    setActiveFlow(null);
    onClearSelection();
  }, [onClearSelection]);

  const handleDismissFlow = useCallback(() => {
    setActiveFlow(null);
  }, []);

  if (count === 0) return null;

  const overflowServices = WR_ACTION_BAR_SERVICES.slice(cutoffIndex);

  return (
    <>
      {/* Warning for WRs with active WO */}
      {wrsWithActiveWo > 0 && (
        <div className="fixed bottom-[68px] left-60 right-0 z-40 flex justify-center px-6">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
            {wrsWithActiveWo} recibo(s) con OT activa seran excluidos
          </div>
        </div>
      )}

      {/* Floating action bar */}
      <div
        className={`fixed bottom-0 left-60 right-0 z-40 transition-transform duration-300 ease-out ${
          mounted ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="border-t bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 px-6 py-3">
            {/* Left: Selection count */}
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900">{count}</span>
              <span className="text-sm text-gray-500">recibo(s)</span>
              <button
                type="button"
                onClick={onClearSelection}
                className="ml-1 text-xs text-gray-400 hover:text-gray-600"
                title="Deseleccionar todo"
              >
                ✕
              </button>
            </div>

            <div className="mx-2 h-6 w-px shrink-0 bg-gray-200" />

            {/* Center: Responsive button container */}
            <div ref={containerRef} className="flex min-w-0 flex-1 items-center gap-1.5">
              {WR_ACTION_BAR_SERVICES.map((type, i) => {
                const disabledReason = getDisabledReason(type, count);
                const isVisible = i < cutoffIndex;
                return (
                  <button
                    key={type}
                    ref={(el) => { buttonRefs.current[i] = el; }}
                    type="button"
                    onClick={() => !disabledReason && setActiveFlow(type)}
                    disabled={!!disabledReason}
                    title={disabledReason ?? WORK_ORDER_TYPE_LABELS[type]}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      disabledReason
                        ? "cursor-not-allowed border-gray-200 text-gray-400 opacity-50"
                        : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    } ${!isVisible ? "invisible" : ""}`}
                    aria-hidden={!isVisible}
                    tabIndex={isVisible ? 0 : -1}
                  >
                    <span>{ICONS[type]}</span>
                    {WORK_ORDER_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>

            {/* Right: Overflow dropdown (only when some buttons don't fit) */}
            {overflowServices.length > 0 && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowOverflow(!showOverflow)}
                  className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                >
                  +{overflowServices.length}
                </button>
                {showOverflow && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowOverflow(false)}
                    />
                    <div className="absolute bottom-full right-0 z-50 mb-2 w-64 rounded-lg border bg-white py-1 shadow-lg">
                      {overflowServices.map((type) => {
                        const disabledReason = getDisabledReason(type, count);
                        const isDestructive = type === "abandon";
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              if (!disabledReason) {
                                setActiveFlow(type);
                                setShowOverflow(false);
                              }
                            }}
                            disabled={!!disabledReason}
                            className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
                              disabledReason
                                ? "cursor-not-allowed opacity-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <span className="mt-0.5 text-sm">{ICONS[type]}</span>
                            <div className="min-w-0 flex-1">
                              <div className={`text-sm font-medium ${isDestructive ? "text-red-600" : "text-gray-900"}`}>
                                {WORK_ORDER_TYPE_LABELS[type]}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {disabledReason ?? WO_TYPE_DESCRIPTIONS[type]}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service flow modals */}
      {activeFlow === "ship" && (
        <ShipFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "consolidate" && (
        <ConsolidateFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "group" && (
        <GroupFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "photos" && (
        <PhotosFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "repack" && (
        <RepackFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "divide" && (
        <DivideFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "inspection" && (
        <InspectionFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "inventory_count" && (
        <InventoryFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "return" && (
        <ReturnFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "special_request" && (
        <SpecialRequestFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
      {activeFlow === "abandon" && (
        <AbandonFlow open onClose={handleDismissFlow} onSuccess={handleCloseFlow} wrs={selectedWrs} warehouseId={warehouseId} agencyId={agencyId} />
      )}
    </>
  );
}
