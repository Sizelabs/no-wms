"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else if (mounted) {
      setVisible(false);
    }
  }, [open, mounted]);

  // Once mounted, force a layout read then trigger the animation
  useEffect(() => {
    if (!mounted || !open) return;
    // Force reflow so the browser registers the initial translate-x-full state
    panelRef.current?.getBoundingClientRect();
    setVisible(true);
  }, [mounted, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handler);
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open]);

  if (!mounted) return null;

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
            setMounted(false);
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
          className="rounded p-1 text-gray-400 hover:text-gray-600"
        >
          <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function SheetBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>;
}
