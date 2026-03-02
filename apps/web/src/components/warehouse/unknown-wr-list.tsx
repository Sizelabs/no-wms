"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { claimUnknownWr } from "@/lib/actions/unknown-wrs";

interface ClaimRecord {
  id: string;
  status: string;
  claimed_by_agency_id: string | null;
  claimed_at: string | null;
}

interface UnknownWr {
  id: string;
  wr_number: string;
  tracking_number: string;
  tracking_number_masked?: string;
  carrier: string | null;
  sender_name: string | null;
  consignees: { full_name: string }[] | { full_name: string } | null;
  received_at: string;
  unknown_wrs: ClaimRecord[] | ClaimRecord | null;
}

interface UnknownWrListProps {
  data: UnknownWr[];
  isAgencyRole: boolean;
  trackingMasked?: boolean;
}

export function UnknownWrList({ data, isAgencyRole, trackingMasked }: UnknownWrListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaim = useCallback(
    (unknownWrId: string) => {
      if (!trackingInput.trim()) {
        setClaimError("Ingrese el número de guía");
        return;
      }

      startTransition(async () => {
        const result = await claimUnknownWr(unknownWrId, trackingInput.trim());
        if (result.success) {
          setClaimingId(null);
          setTrackingInput("");
          setClaimError(null);
          router.refresh();
        } else {
          setClaimError(result.error ?? "Error al reclamar");
        }
      });
    },
    [trackingInput, router],
  );

  return (
    <div className="rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">WR#</th>
            <th className="px-4 py-3">Guía</th>
            <th className="px-4 py-3">Remitente</th>
            <th className="px-4 py-3">Destinatario</th>
            <th className="px-4 py-3">Transportista</th>
            <th className="px-4 py-3">Fecha</th>
            {isAgencyRole && <th className="px-4 py-3">Acción</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.length === 0 ? (
            <tr>
              <td colSpan={isAgencyRole ? 7 : 6} className="px-4 py-8 text-center text-gray-400">
                No hay paquetes desconocidos.
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const claimRecord = Array.isArray(item.unknown_wrs) ? item.unknown_wrs[0] : item.unknown_wrs;
              const claimStatus = claimRecord?.status ?? "unclaimed";
              return (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs">
                  {item.wr_number}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                  {trackingMasked && item.tracking_number_masked ? (
                    <span>
                      <span className="select-none blur-[3px]" aria-hidden="true">
                        {item.tracking_number_masked.slice(0, -3)}
                      </span>
                      <span>{item.tracking_number_masked.slice(-3)}</span>
                    </span>
                  ) : (
                    item.tracking_number
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {item.sender_name ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {(Array.isArray(item.consignees) ? item.consignees[0]?.full_name : item.consignees?.full_name) ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-gray-600">
                  {item.carrier ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400">
                  {new Date(item.received_at).toLocaleDateString("es")}
                </td>
                {isAgencyRole && (
                  <td className="px-4 py-2.5">
                    {claimStatus === "unclaimed" && (
                      <>
                        {claimingId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={trackingInput}
                              onChange={(e) => setTrackingInput(e.target.value)}
                              placeholder="# de guía"
                              className="w-32 rounded border px-2 py-1 text-xs focus:border-gray-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleClaim(item.id)}
                              disabled={isPending}
                              className="rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                              {isPending ? "..." : "OK"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setClaimingId(null);
                                setClaimError(null);
                              }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setClaimingId(item.id);
                              setTrackingInput("");
                              setClaimError(null);
                            }}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            Reclamar
                          </button>
                        )}
                        {claimError && claimingId === item.id && (
                          <p className="mt-1 text-xs text-red-500">{claimError}</p>
                        )}
                      </>
                    )}
                  </td>
                )}
              </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
