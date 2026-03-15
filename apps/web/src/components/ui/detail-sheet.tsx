"use client";

import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Sheet, SheetBody, SheetHeader, SheetToolbar, TOOLBAR_LABEL_BUTTON } from "@/components/ui/sheet";

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
          {editAction && (
            <button
              type="button"
              onClick={editAction}
              title="Editar"
              className={TOOLBAR_LABEL_BUTTON}
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
              className={TOOLBAR_LABEL_BUTTON}
            >
              <ExternalLink className="size-3.5" />
              Abrir detalle
            </Link>
          )}
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
