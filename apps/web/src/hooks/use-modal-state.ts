"use client";

import { useCallback, useState } from "react";

export function useModalState<T>() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEditItem(null);
    setCreateOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setCreateOpen(false);
    setEditItem(item);
  }, []);

  const close = useCallback(() => {
    setCreateOpen(false);
    setEditItem(null);
  }, []);

  return { createOpen, editItem, openCreate, openEdit, close };
}
