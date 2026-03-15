"use client";

import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Sheet, SheetBody, SheetHeader, SheetToolbar } from "@/components/ui/sheet";

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
      {(detailHref || editAction) && (
        <SheetToolbar>
          <div className="flex flex-1 items-center justify-end gap-1">
            {editAction && (
              <button
                onClick={editAction}
                title="Editar"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200/60 hover:text-gray-900"
              >
                <Pencil className="size-3.5" />
                Editar
              </button>
            )}
            {detailHref && (
              <Link
                href={detailHref}
                onClick={onClose}
                title="Abrir pagina completa"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200/60 hover:text-gray-900"
              >
                <ExternalLink className="size-3.5" />
                Abrir detalle
              </Link>
            )}
          </div>
        </SheetToolbar>
      )}
      <SheetBody>
        <div className="space-y-5">
          {children}
        </div>
      </SheetBody>
    </Sheet>
  );
}
