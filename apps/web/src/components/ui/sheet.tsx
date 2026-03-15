"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

type SheetState = "closed" | "mounting" | "open" | "closing";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ open, onClose, children }: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [state, setState] = useState<SheetState>("closed");
  const visible = state === "open";

  useEffect(() => {
    if (open) {
      setState("mounting");
      // Double-rAF: first frame paints the off-screen position,
      // second frame triggers the CSS transition
      const raf = requestAnimationFrame(() => {
        panelRef.current?.getBoundingClientRect();
        requestAnimationFrame(() => setState("open"));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setState((prev) => (prev === "closed" ? "closed" : "closing"));
    }
  }, [open]);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  if (state === "closed") return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: visible ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0)",
        transition: "background-color 200ms ease-out",
      }}
    >
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: "42rem",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 200ms ease-out",
        }}
        className="flex flex-col bg-white shadow-2xl"
        onTransitionEnd={(e) => {
          if (e.propertyName === "transform" && !open) {
            setState("closed");
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-5">
      <h2 className="text-lg font-semibold text-gray-900">{children}</h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="size-5" />
        </button>
      )}
    </div>
  );
}

export const TOOLBAR_ICON_BUTTON = "rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-700";
export const TOOLBAR_LABEL_BUTTON = "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200/60 hover:text-gray-900";

export function SheetToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-gray-50/80 px-5 py-2.5">
      {children}
    </div>
  );
}

export function SheetBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>;
}
