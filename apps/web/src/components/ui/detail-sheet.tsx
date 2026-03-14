"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Sheet, SheetBody, SheetHeader } from "@/components/ui/sheet";

interface DetailSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  detailHref?: string;
  editAction?: () => void;
  children: ReactNode;
}

export function DetailSheet({ open, onClose, title, detailHref, editAction, children }: DetailSheetProps) {
  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader onClose={onClose}>{title}</SheetHeader>
      <SheetBody>
        <div className="space-y-5">
          {(detailHref || editAction) && (
            <div className="flex justify-end gap-2">
              {editAction && (
                <button
                  onClick={editAction}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </button>
              )}
              {detailHref && (
                <Link
                  href={detailHref}
                  onClick={onClose}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Abrir pagina completa
                </Link>
              )}
            </div>
          )}
          {children}
        </div>
      </SheetBody>
    </Sheet>
  );
}
