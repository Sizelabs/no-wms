"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { searchConsignees } from "@/lib/actions/consignees";
import { updateWarehouseReceiptField } from "@/lib/actions/warehouse-receipts";

interface ConsigneeInlineEditProps {
  wrId: string;
  agencyId: string | null;
  consigneeName: string | null;
  casillero: string | null;
  onSelect?: (name: string | null, casillero: string | null) => void;
}

interface ConsigneeResult {
  id: string;
  full_name: string;
  casillero: string | null;
}

export function ConsigneeInlineEdit({
  wrId,
  agencyId,
  consigneeName,
  casillero,
  onSelect,
}: ConsigneeInlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConsigneeResult[]>([]);
  const [displayName, setDisplayName] = useState(consigneeName);
  const [displayCasillero, setDisplayCasillero] = useState(casillero);
  const [flash, setFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotification();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setDisplayName(consigneeName);
    setDisplayCasillero(casillero);
  }, [consigneeName, casillero]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing || query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await searchConsignees(agencyId, query);
      setResults(data ?? []);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, editing, agencyId]);

  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
        setQuery("");
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing]);

  const selectConsignee = useCallback(
    (c: ConsigneeResult) => {
      setDisplayName(c.full_name);
      setDisplayCasillero(c.casillero);
      onSelect?.(c.full_name, c.casillero);
      setEditing(false);
      setQuery("");
      setResults([]);

      startTransition(async () => {
        const result = await updateWarehouseReceiptField(wrId, "consignee_id", c.id);
        if (result.error) {
          setDisplayName(consigneeName);
          setDisplayCasillero(casillero);
          onSelect?.(consigneeName, casillero);
          notify(result.error, "error");
        } else {
          setFlash(true);
          setTimeout(() => setFlash(false), 800);
        }
      });
    },
    [wrId, consigneeName, casillero, notify, onSelect],
  );

  const saveFreetext = useCallback(() => {
    const text = query.trim();
    if (!text) {
      setEditing(false);
      setQuery("");
      return;
    }

    setDisplayName(text);
    setDisplayCasillero(null);
    onSelect?.(text, null);
    setEditing(false);
    setQuery("");
    setResults([]);

    startTransition(async () => {
      const result = await updateWarehouseReceiptField(wrId, "consignee_name", text);
      if (result.error) {
        setDisplayName(consigneeName);
        setDisplayCasillero(casillero);
        onSelect?.(consigneeName, casillero);
        notify(result.error, "error");
      } else {
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      }
    });
  }, [query, wrId, consigneeName, casillero, notify, onSelect]);

  if (editing) {
    return (
      <div ref={containerRef} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditing(false);
              setQuery("");
              setResults([]);
            } else if (e.key === "Enter") {
              saveFreetext();
            }
          }}
          placeholder="Buscar consignatario..."
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:outline-none"
        />
        {results.length > 0 && (
          <div className="absolute left-0 z-20 mt-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg print:hidden">
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConsignee(c)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{c.full_name}</span>
                {c.casillero && (
                  <span className="font-mono text-[10px] text-slate-400">{c.casillero}</span>
                )}
              </button>
            ))}
          </div>
        )}
        {isPending && (
          <span className="absolute right-2 top-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
        )}
      </div>
    );
  }

  const isEmpty = !displayName;

  return (
    <span
      onClick={() => {
        setQuery("");
        setEditing(true);
      }}
      className={`cursor-pointer border-b border-dashed border-transparent transition-all hover:border-blue-300 print:border-0 print:cursor-default ${
        flash
          ? "text-emerald-600"
          : isEmpty
            ? "italic text-slate-400"
            : "font-semibold text-slate-900"
      }`}
    >
      {displayName ?? "Sin asignar"}
      {displayCasillero && (
        <span className="ml-1.5 font-mono text-[10px] font-normal text-slate-400">
          {displayCasillero}
        </span>
      )}
      {isPending && (
        <span className="ml-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
      )}
    </span>
  );
}
