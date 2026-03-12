"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
}

const SIZE_CLASSES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, size = "md", children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Use a ref to avoid re-running the effect when onClose changes
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    // Focus trap: focus the content on open
    contentRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={`${SIZE_CLASSES[size]} mx-4 w-full max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl outline-none`}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-4">
      <h2 className="text-base font-semibold text-gray-900">{children}</h2>
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

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="px-5 py-4">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
      {children}
    </div>
  );
}
