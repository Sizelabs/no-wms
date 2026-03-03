"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";

interface WrPackageSummary {
  tracking_number: string;
  carrier: string;
  billable_weight_lb: number;
  declared_value_usd: number | null;
}

interface WrSummaryItem {
  id: string;
  wr_number: string;
  total_billable_weight_lb: number | null;
  total_declared_value_usd: number | null;
  total_pieces: number;
  total_packages: number;
  has_dgr_package: boolean;
  has_damaged_package: boolean;
  packages: WrPackageSummary[];
  consignees: { full_name: string; casillero: string | null } | null;
}

interface ServiceFlowWrapperProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "sm" | "md" | "lg";
  wrs: WrSummaryItem[];
  submitLabel: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  onSubmit: () => void;
  variant?: "default" | "destructive";
  headerNote?: string;
  children: ReactNode;
}

export function ServiceFlowWrapper({
  open,
  onClose,
  title,
  size = "md",
  wrs,
  submitLabel,
  submitDisabled = false,
  submitting = false,
  onSubmit,
  variant = "default",
  headerNote,
  children,
}: ServiceFlowWrapperProps) {
  const btnClass =
    variant === "destructive"
      ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      : "rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  return (
    <Modal open={open} onClose={onClose} size={size}>
      <ModalHeader onClose={onClose}>{title}</ModalHeader>
      <ModalBody>
        <WrDetailSection wrs={wrs} />
        {headerNote && (
          <p className="mt-3 text-sm text-gray-500">{headerNote}</p>
        )}
        <div className="mt-4 space-y-4">{children}</div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled || submitting}
          className={btnClass}
        >
          {submitting ? "Procesando..." : submitLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
}

/** WR detail section — shows each WR with its packages in a clean list. */
function WrDetailSection({ wrs }: { wrs: WrSummaryItem[] }) {
  const [expanded, setExpanded] = useState(wrs.length <= 3);

  const totalWeight = wrs.reduce((sum, wr) => sum + (Number(wr.total_billable_weight_lb) || 0), 0);
  const totalValue = wrs.reduce((sum, wr) => sum + (Number(wr.total_declared_value_usd) || 0), 0);
  const totalPackages = wrs.reduce((sum, wr) => sum + (wr.total_packages || 0), 0);

  const visible = expanded ? wrs : wrs.slice(0, 2);
  const hiddenCount = wrs.length - visible.length;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60">
      {/* Aggregate row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
          <span className="font-medium text-gray-900">{wrs.length} recibo{wrs.length !== 1 && "s"}</span>
          <Dot />
          <span className="text-gray-500">{totalPackages} paq.</span>
          <Dot />
          <span className="text-gray-500">{totalWeight.toFixed(1)} lb</span>
          {totalValue > 0 && (
            <>
              <Dot />
              <span className="text-gray-500">${totalValue.toFixed(2)}</span>
            </>
          )}
        </span>
        <svg
          className={`size-4 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* WR list */}
      {expanded && (
        <div className="border-t border-gray-100">
          {visible.map((wr) => (
            <WrRow key={wr.id} wr={wr} />
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full px-3 py-1.5 text-left text-xs text-gray-400 hover:text-gray-600"
            >
              + {hiddenCount} mas...
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WrRow({ wr }: { wr: WrSummaryItem }) {
  const flags: string[] = [];
  if (wr.has_dgr_package) flags.push("DGR");
  if (wr.has_damaged_package) flags.push("Dano");

  return (
    <div className="border-t border-gray-100 px-3 py-2 first:border-t-0">
      {/* WR header line */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 font-mono text-xs font-medium text-gray-900">{wr.wr_number}</span>
          {wr.consignees && (
            <span className="truncate text-xs text-gray-400">
              {wr.consignees.full_name}
              {wr.consignees.casillero && ` #${wr.consignees.casillero}`}
            </span>
          )}
          {flags.map((f) => (
            <span
              key={f}
              className={`shrink-0 rounded px-1 text-[10px] font-medium ${
                f === "DGR"
                  ? "bg-orange-50 text-orange-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {f}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
          <span>{wr.total_packages} paq.</span>
          <span>{wr.total_billable_weight_lb?.toFixed(1) ?? "—"} lb</span>
          {wr.total_declared_value_usd != null && (
            <span>${Number(wr.total_declared_value_usd).toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Package tracking numbers */}
      {wr.packages.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {wr.packages.map((pkg, i) => (
            <span key={i} className="text-[11px] text-gray-400">
              {pkg.carrier && <span className="text-gray-300">{pkg.carrier} </span>}
              {pkg.tracking_number}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Dot() {
  return <span className="text-gray-300" aria-hidden>·</span>;
}

export type { WrSummaryItem, WrPackageSummary };
