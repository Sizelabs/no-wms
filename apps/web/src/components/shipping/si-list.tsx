"use client";

import { FORWARDER_SIDE_ROLES, ROLES } from "@no-wms/shared/constants/roles";
import { SI_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { SiActionBar } from "@/components/shipping/si-action-bar";
import { SiRejectModal } from "@/components/shipping/si-reject-modal";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import {
  approveShippingInstruction,
  finalizeShippingInstruction,
  rejectShippingInstruction,
} from "@/lib/actions/shipping-instructions";
import { formatDate } from "@/lib/format";

interface HouseBill {
  id: string;
  hawb_number: string;
  document_type: string;
}

interface ShippingInstruction {
  id: string;
  si_number: string;
  modality: string;
  modalities: { id: string; name: string; code: string } | null;
  status: string;
  agency_id: string | null;
  destination_id: string | null;
  total_pieces: number | null;
  total_billable_weight_lb: number | null;
  created_at: string;
  agencies: { name: string; code: string } | null;
  consignees: { full_name: string } | null;
  hawbs: HouseBill[];
  shipping_instruction_items: { warehouse_receipt_id: string; warehouse_receipts: { total_billable_weight_lb: number | null } | null }[];
}

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

interface SiListProps {
  data: ShippingInstruction[];
  locale: string;
  warehouses: Warehouse[];
  destinations: Destination[];
  carriers: Carrier[];
  agencies: Agency[];
  orgName?: string;
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  finalized: "bg-purple-100 text-purple-800",
  manifested: "bg-indigo-100 text-indigo-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

function formatWeight(si: ShippingInstruction): string {
  const w = si.total_billable_weight_lb
    ?? (si.shipping_instruction_items.reduce((s, i) => s + Number(i.warehouse_receipts?.total_billable_weight_lb ?? 0), 0) || null);
  return w ? `${Number(w).toFixed(1)} lb` : "—";
}

export function SiList({ data, locale, warehouses, destinations, carriers, agencies, orgName }: SiListProps) {
  const { notify } = useNotification();
  const t = useTranslations("shipping");
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ status: ["requested", "approved", "finalized"] as string[], modality: [] as string[] });
  const [showFilters, setShowFilters] = useState(false);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const roles = useUserRoles();
  const isDestinationAdmin = roles.includes(ROLES.DESTINATION_ADMIN);
  const isForwarderSide = roles.some((r) => (FORWARDER_SIDE_ROLES as readonly string[]).includes(r));

  const hasActions = data.some((si) =>
    si.status === "requested" || (si.status === "approved" && isForwarderSide)
  );

  // Build unique modality filter options from data
  const uniqueModalities = useMemo(() => {
    const seen = new Map<string, string>();
    for (const si of data) {
      const key = si.modalities?.code ?? si.modality;
      if (key && !seen.has(key)) {
        seen.set(key, si.modalities?.name ?? si.modality);
      }
    }
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [data]);

  // Finalized SIs without HAWBs can be selected for shipment creation
  const selectableIds = useMemo(
    () => new Set(data.filter((si) => si.status === "finalized" && si.hawbs.length === 0).map((si) => si.id)),
    [data],
  );

  const filtered = data.filter((si) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        si.si_number.toLowerCase().includes(q) ||
        si.agencies?.name?.toLowerCase().includes(q) ||
        si.agencies?.code?.toLowerCase().includes(q) ||
        si.consignees?.full_name?.toLowerCase().includes(q) ||
        si.hawbs.some((h) => h.hawb_number.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (filter.status.length > 0 && !filter.status.includes(si.status)) return false;
    if (filter.modality.length > 0) {
      const siModalityCode = si.modalities?.code ?? si.modality;
      if (!filter.modality.includes(siModalityCode)) return false;
    }
    return true;
  });

  const selectableFiltered = filtered.filter((si) => selectableIds.has(si.id));
  const allSelectableSelected = selectableFiltered.length > 0 && selectableFiltered.every((si) => selected.has(si.id));

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelectableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableFiltered.map((si) => si.id)));
    }
  }, [allSelectableSelected, selectableFiltered]);

  // Collect selected SIs for shipment creation
  const selectedSIs = useMemo(() => {
    return data
      .filter((si) => selected.has(si.id))
      .map((si) => ({
        id: si.id,
        si_number: si.si_number,
        modality_code: si.modalities?.code ?? si.modality,
        agency_id: si.agency_id ?? undefined,
        agency_name: si.agencies?.name ?? undefined,
        destination_id: si.destination_id ?? undefined,
      }));
  }, [data, selected]);

  const activeFilterCount = [filter.modality].filter((f) => f.length > 0).length;

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveShippingInstruction(id);
      if (result.error) notify(result.error, "error");
      else notify(t("approvedSuccess"), "success");
    });
  };

  const handleReject = (reason: string) => {
    if (!rejectTarget) return;
    const id = rejectTarget;
    startTransition(async () => {
      const result = await rejectShippingInstruction(id, reason);
      if (result.error) notify(result.error, "error");
      else { setRejectTarget(null); notify(t("rejectedSuccess"), "success"); }
    });
  };

  const handleFinalize = (id: string) => {
    startTransition(async () => {
      const result = await finalizeShippingInstruction(id);
      if (result.error) {
        notify(result.error, "error");
      } else {
        notify(t("finalizedSuccess"), "success");
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Search + primary filter row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar SI, agencia, consignatario, HAWB..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todos los estados"
          options={Object.entries(SI_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          selected={filter.status}
          onChange={(v) => setFilter((f) => ({ ...f, status: v }))}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-md border px-3 py-2 text-sm ${
            activeFilterCount > 0
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filtros<span className={`transition-opacity ${activeFilterCount > 0 ? "opacity-100" : "opacity-0"}`}>{` (${Math.max(activeFilterCount, 1)})`}</span>
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-md border bg-gray-50 p-3">
          <MultiSelectFilter
            label="Todas las modalidades"
            options={uniqueModalities}
            selected={filter.modality}
            onChange={(v) => setFilter((f) => ({ ...f, modality: v }))}
          />
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilter((f) => ({ ...f, modality: [] }))}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelectableSelected}
                  onChange={toggleAll}
                  disabled={selectableFiltered.length === 0}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-3">SI #</th>
              <th className="px-3 py-3">Modalidad</th>
              <th className="px-3 py-3">Agencia</th>
              <th className="px-3 py-3">Consignatario</th>
              <th className="px-3 py-3">WRs</th>
              <th className="px-3 py-3">Peso</th>
              <th className="px-3 py-3">Guía</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Fecha</th>
              {hasActions && <th className="px-3 py-3">{t("actions")}</th>}
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={hasActions ? 11 : 10}
            emptyMessage="No hay instrucciones de embarque"
            renderRow={(si) => {
              const isSelectable = selectableIds.has(si.id);
              const isSelected = selected.has(si.id);
              return (
                <tr
                  key={si.id}
                  className={`border-t border-gray-100 hover:bg-gray-50${isSelectable ? " cursor-pointer" : ""}`}
                  onClick={() => { if (isSelectable) toggleSelect(si.id); }}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {isSelectable ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(si.id)}
                        className="rounded border-gray-300"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        disabled
                        className="rounded border-gray-200 opacity-30"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/${locale}/shipping-instructions/${si.id}`}
                      className="font-mono text-xs font-medium text-gray-900 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {si.si_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {si.modalities?.name ?? si.modality}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {si.agencies ? `${si.agencies.name} (${si.agencies.code})` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{si.consignees?.full_name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">{si.shipping_instruction_items.length}</td>
                  <td className="px-3 py-2.5 text-xs">{formatWeight(si)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {si.hawbs.length ? si.hawbs.map((h) => h.hawb_number).join(", ") : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[si.status] ?? ""}`}>
                      {SI_STATUS_LABELS[si.status as keyof typeof SI_STATUS_LABELS] ?? si.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">
                    {formatDate(si.created_at)}
                  </td>
                  {hasActions && (
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {si.status === "requested" && isDestinationAdmin && (
                        <>
                          <button
                            onClick={() => handleApprove(si.id)}
                            disabled={isPending}
                            className="rounded border px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                          >
                            {t("approve")}
                          </button>
                          <button
                            onClick={() => setRejectTarget(si.id)}
                            disabled={isPending}
                            className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                          >
                            {t("reject")}
                          </button>
                        </>
                      )}
                      {si.status === "requested" && !isDestinationAdmin && (
                        <span className="text-xs text-amber-600">{t("pendingCourierApproval")}</span>
                      )}
                      {si.status === "approved" && isForwarderSide && (
                        <button
                          onClick={() => handleFinalize(si.id)}
                          disabled={isPending}
                          className="rounded border px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-50"
                        >
                          {t("finalize")}
                        </button>
                      )}
                    </div>
                  </td>
                  )}
                </tr>
              );
            }}
          />
        </table>
      </div>

      <SiRejectModal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        isPending={isPending}
      />

      {/* Bottom padding when action bar is visible */}
      {selected.size > 0 && <div className="h-16" />}

      <SiActionBar
        selectedSIs={selectedSIs}
        onClearSelection={() => setSelected(new Set())}
        warehouses={warehouses}
        destinations={destinations}
        carriers={carriers}
        agencies={agencies}
        orgName={orgName}
      />
    </div>
  );
}
