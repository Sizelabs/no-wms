"use client";

import { useCallback, useEffect, useState } from "react";

export function useSheetState<T extends { id: string }>(items: T[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const open = selectedId !== null;
  const selectedItem = open ? items.find((item) => item.id === selectedId) ?? null : null;

  const openSheet = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const closeSheet = useCallback(() => {
    setSelectedId(null);
  }, []);

  useEffect(() => {
    if (!open || !selectedId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const idx = items.findIndex((item) => item.id === selectedId);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowDown"
        ? Math.min(idx + 1, items.length - 1)
        : Math.max(idx - 1, 0);
      if (nextIdx === idx) return;
      const next = items[nextIdx];
      if (next) setSelectedId(next.id);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, selectedId, items]);

  return { selectedId, selectedItem, open, openSheet, closeSheet };
}
