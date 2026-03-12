"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";

interface SiRejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

export function SiRejectModal({ open, onClose, onConfirm, isPending }: SiRejectModalProps) {
  const t = useTranslations("shipping");
  const tc = useTranslations("common");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError(true);
      return;
    }
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason("");
    setError(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <ModalHeader onClose={handleClose}>{t("rejectTitle")}</ModalHeader>
      <ModalBody>
        <label className="block text-sm font-medium text-gray-700">
          {t("rejectReasonLabel")}
        </label>
        <textarea
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError(false); }}
          placeholder={t("rejectReasonPlaceholder")}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        {error && (
          <p className="mt-1 text-xs text-red-600">{t("rejectReasonRequired")}</p>
        )}
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {tc("cancel")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {t("reject")}
        </button>
      </ModalFooter>
    </Modal>
  );
}
