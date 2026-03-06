"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import {
  approveShippingInstruction,
  finalizeShippingInstruction,
  rejectShippingInstruction,
} from "@/lib/actions/shipping-instructions";

interface SiActionsProps {
  siId: string;
  status: string;
}

export function SiActions({ siId, status }: SiActionsProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (["finalized", "manifested", "rejected", "cancelled"].includes(status)) {
    return null;
  }

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveShippingInstruction(siId);
      if (result.error) { setError(result.error); notify(result.error, "error"); }
      else { notify("Instrucción aprobada", "success"); router.refresh(); }
    });
  };

  const handleReject = () => {
    const reason = prompt("Razón de rechazo:");
    if (!reason?.trim()) return;
    startTransition(async () => {
      const result = await rejectShippingInstruction(siId, reason);
      if (result.error) { setError(result.error); notify(result.error, "error"); }
      else { notify("Instrucción rechazada", "success"); router.refresh(); }
    });
  };

  const handleFinalize = () => {
    startTransition(async () => {
      const result = await finalizeShippingInstruction(siId);
      if (result.error) { setError(result.error); notify(result.error, "error"); }
      else { notify("Instrucción finalizada — HAWB generado", "success"); router.refresh(); }
    });
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Acciones</h3>
      {error && (
        <p className="mb-2 text-xs text-red-600">{error}</p>
      )}
      <div className="space-y-2">
        {status === "requested" && (
          <>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              onClick={handleReject}
              disabled={isPending}
              className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Rechazar
            </button>
          </>
        )}
        {status === "approved" && (
          <button
            onClick={handleFinalize}
            disabled={isPending}
            className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            Finalizar (Generar HAWB)
          </button>
        )}
      </div>
    </div>
  );
}
