"use client";

import { FORWARDER_SIDE_ROLES, ROLES } from "@no-wms/shared/constants/roles";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { SiRejectModal } from "@/components/shipping/si-reject-modal";
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
  const t = useTranslations("shipping");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const roles = useUserRoles();

  const isDestinationAdmin = roles.includes(ROLES.DESTINATION_ADMIN);
  const isForwarderSide = roles.some((r) => (FORWARDER_SIDE_ROLES as readonly string[]).includes(r));

  if (["finalized", "manifested", "rejected", "cancelled"].includes(status)) {
    return null;
  }

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveShippingInstruction(siId);
      if (result.error) { setError(result.error); notify(result.error, "error"); }
      else { notify(t("approvedSuccess"), "success"); router.refresh(); }
    });
  };

  const handleReject = (reason: string) => {
    startTransition(async () => {
      const result = await rejectShippingInstruction(siId, reason);
      if (result.error) { setError(result.error); notify(result.error, "error"); }
      else { setRejectOpen(false); notify(t("rejectedSuccess"), "success"); router.refresh(); }
    });
  };

  const handleFinalize = () => {
    startTransition(async () => {
      const result = await finalizeShippingInstruction(siId);
      if (result.error) { setError(result.error); notify(result.error, "error"); }
      else { notify(t("finalizedSuccess"), "success"); router.refresh(); }
    });
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{t("actions")}</h3>
      {error && (
        <p className="mb-2 text-xs text-red-600">{error}</p>
      )}
      <div className="space-y-2">
        {status === "requested" && isDestinationAdmin && (
          <>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {t("approve")}
            </button>
            <button
              onClick={() => setRejectOpen(true)}
              disabled={isPending}
              className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {t("reject")}
            </button>
          </>
        )}
        {status === "requested" && !isDestinationAdmin && (
          <p className="text-sm text-amber-600">{t("pendingCourierApproval")}</p>
        )}
        {status === "approved" && isForwarderSide && (
          <button
            onClick={handleFinalize}
            disabled={isPending}
            className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {t("finalize")} ({t("generateHawb")})
          </button>
        )}
      </div>
      <SiRejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        isPending={isPending}
      />
    </div>
  );
}
