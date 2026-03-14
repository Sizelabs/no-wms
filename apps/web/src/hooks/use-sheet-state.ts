"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSheetState<T extends { id: string }>(items: T[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const open = selectedId !== null;
  const selectedItem = open ? items.find((item) => item.id === selectedId) ?? null : null;

  // Close sheet if the selected item is no longer in the list (e.g. after filtering)
  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, items]);

  const openSheet = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const closeSheet = useCallback(() => {
    setSelectedId(null);
  }, []);

  // Arrow key navigation — use refs so the listener is only attached/detached
  // when the sheet opens/closes, not on every render or arrow-key press
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const currentItems = itemsRef.current;
      const currentId = selectedIdRef.current;
      const idx = currentItems.findIndex((item) => item.id === currentId);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowDown"
        ? Math.min(idx + 1, currentItems.length - 1)
        : Math.max(idx - 1, 0);
      if (nextIdx === idx) return;
      const next = currentItems[nextIdx];
      if (next) setSelectedId(next.id);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return { selectedId, selectedItem, open, openSheet, closeSheet };
}
