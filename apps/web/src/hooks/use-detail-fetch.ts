"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fetches detail data for the currently selected item in a list drawer.
 * Handles nonce-based stale-response protection, unmount cleanup, and
 * clears data on selection change to avoid showing stale details.
 */
export function useDetailFetch<T>(
  selectedId: string | null,
  fetchFn: (id: string) => Promise<{ data: T | null }>,
): T | null {
  const [data, setData] = useState<T | null>(null);
  const nonceRef = useRef(0);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  useEffect(() => {
    if (!selectedId) {
      setData(null);
      return;
    }

    // Clear previous detail to avoid stale data flash
    setData(null);

    const nonce = ++nonceRef.current;
    let cancelled = false;

    fetchRef.current(selectedId)
      .then(({ data: result }) => {
        if (cancelled || nonceRef.current !== nonce) return;
        setData(result);
      })
      .catch(() => {
        // Server action failed — leave data as null
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return data;
}
