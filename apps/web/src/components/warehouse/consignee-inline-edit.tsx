"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { quickCreateConsignee, searchConsignees } from "@/lib/actions/consignees";
import { updateWarehouseReceiptField } from "@/lib/actions/warehouse-receipts";

interface ConsigneeInlineEditProps {
  wrId: string;
  agencyId: string | null;
  consigneeName: string | null;
  casillero: string | null;
  onSelect?: (name: string | null, casillero: string | null) => void;
  disabled?: boolean;
  /** "inline" = click-to-edit span (document body), "input" = always-visible input (sidebar panel) */
  variant?: "inline" | "input";
  /** Custom class for the input element (only used with variant="input") */
  inputClassName?: string;
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
  disabled = false,
  variant = "inline",
  inputClassName,
}: ConsigneeInlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState(variant === "input" ? (consigneeName ?? "") : "");
  const [results, setResults] = useState<ConsigneeResult[]>([]);
  const [displayName, setDisplayName] = useState(consigneeName);
  const [displayCasillero, setDisplayCasillero] = useState(casillero);
  const [flash, setFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotification();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setDisplayName(consigneeName);
    setDisplayCasillero(casillero);
    if (variant === "input") setQuery(consigneeName ?? "");
  }, [consigneeName, casillero, variant]);

  // Focus on edit (inline variant)
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  // Debounced search
  useEffect(() => {
    const isActive = variant === "input" ? true : editing;
    const skipSearch = variant === "input" ? query === consigneeName : false;
    if (!isActive || query.length < 2 || skipSearch) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await searchConsignees(agencyId, query);
      const items = data ?? [];
      setResults(items);
      if (variant === "input") setDropdownOpen(true);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, editing, agencyId, consigneeName, variant]);

  // Click-outside handler
  useEffect(() => {
    const isActive = variant === "input" ? true : editing;
    if (!isActive) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (variant === "inline") {
          setEditing(false);
          setQuery("");
          setResults([]);
        } else {
          setDropdownOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing, variant]);

  const selectConsignee = useCallback(
    (c: ConsigneeResult) => {
      setDisplayName(c.full_name);
      setDisplayCasillero(c.casillero);
      onSelect?.(c.full_name, c.casillero);
      if (variant === "inline") {
        setEditing(false);
        setQuery("");
      } else {
        setQuery(c.full_name);
        setDropdownOpen(false);
      }
      setResults([]);

      startTransition(async () => {
        const result = await updateWarehouseReceiptField(wrId, "consignee_id", c.id);
        if (result.error) {
          setDisplayName(consigneeName);
          setDisplayCasillero(casillero);
          onSelect?.(consigneeName, casillero);
          if (variant === "input") setQuery(consigneeName ?? "");
          notify(result.error, "error");
        } else {
          setFlash(true);
          setTimeout(() => setFlash(false), 800);
        }
      });
    },
    [wrId, consigneeName, casillero, notify, onSelect, variant],
  );

  const saveFreetext = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      if (variant === "inline") {
        setEditing(false);
        setQuery("");
      } else {
        setQuery(consigneeName ?? "");
      }
      return;
    }

    if (trimmed === (consigneeName ?? "")) return;

    setDisplayName(trimmed);
    setDisplayCasillero(null);
    onSelect?.(trimmed, null);
    if (variant === "inline") {
      setEditing(false);
      setQuery("");
      setResults([]);
    }

    startTransition(async () => {
      const result = await updateWarehouseReceiptField(wrId, "consignee_name", trimmed);
      if (result.error) {
        setDisplayName(consigneeName);
        setDisplayCasillero(casillero);
        onSelect?.(consigneeName, casillero);
        if (variant === "input") setQuery(consigneeName ?? "");
        notify(result.error, "error");
      } else {
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      }
    });
  }, [variant, wrId, consigneeName, casillero, notify, onSelect]);

  const handleCreate = useCallback(async () => {
    const name = query.trim();
    if (!name || !agencyId) return;
    setIsCreating(true);
    const fd = new FormData();
    fd.set("agency_id", agencyId);
    fd.set("full_name", name);
    const result = await quickCreateConsignee(fd);
    if (result.data) {
      setDisplayName(result.data.full_name);
      setDisplayCasillero(result.data.casillero);
      onSelect?.(result.data.full_name, result.data.casillero);
      if (variant === "inline") {
        setEditing(false);
        setQuery("");
      } else {
        setQuery(result.data.full_name);
        setDropdownOpen(false);
      }
      setResults([]);
      startTransition(async () => {
        const upd = await updateWarehouseReceiptField(wrId, "consignee_id", result.data!.id);
        if (upd.error) {
          setDisplayName(consigneeName);
          setDisplayCasillero(casillero);
          onSelect?.(consigneeName, casillero);
          if (variant === "input") setQuery(consigneeName ?? "");
          notify(upd.error, "error");
        } else {
          setFlash(true);
          setTimeout(() => setFlash(false), 800);
        }
      });
    } else {
      notify(result.error ?? "Error al crear destinatario", "error");
    }
    setIsCreating(false);
  }, [query, agencyId, wrId, consigneeName, casillero, notify, onSelect, variant]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const handleInputBlur = useCallback(() => {
    // Delay to allow dropdown clicks to register
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      if (containerRef.current?.contains(document.activeElement)) return;
      setDropdownOpen(false);
      saveFreetext(query);
    }, 150);
  }, [query, saveFreetext]);

  const canCreate = query.trim().length >= 2 && !!agencyId;
  const isEmpty = !displayName;

  if (disabled) {
    return (
      <span className={isEmpty ? "italic text-slate-400" : "font-semibold text-slate-900"}>
        {displayName ?? "Sin asignar"}
        {displayCasillero && (
          <span className="ml-1.5 font-mono text-[10px] font-normal text-slate-400">
            {displayCasillero}
          </span>
        )}
      </span>
    );
  }

  /* ── Dropdown (shared between both variants) ── */
  const dropdown = (hasResults: boolean) =>
    hasResults || canCreate ? (
      <div className="absolute left-0 z-50 mt-1 max-h-48 w-full min-w-[16rem] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg print:hidden">
        {results.map((c) => (
          <button
            key={c.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              selectConsignee(c);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-50"
          >
            <span className="font-medium text-slate-900">{c.full_name}</span>
            {c.casillero && (
              <span className="font-mono text-xs text-slate-400">{c.casillero}</span>
            )}
          </button>
        ))}
        {canCreate && (
          <>
            {results.length > 0 && <div className="border-t border-slate-100" />}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              disabled={isCreating}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-slate-700">
                {isCreating
                  ? "Creando..."
                  : <>Crear <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span></>
                }
              </span>
            </button>
          </>
        )}
      </div>
    ) : null;

  /* ── Variant: input (sidebar panel — always-visible input) ── */
  if (variant === "input") {
    const showDropdown = dropdownOpen && (results.length > 0 || canCreate);
    return (
      <div ref={containerRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length >= 2) setDropdownOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0 || canCreate) setDropdownOpen(true);
          }}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery(consigneeName ?? "");
              setDropdownOpen(false);
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Enter") {
              setDropdownOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Buscar consignatario..."
          className={inputClassName ?? "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"}
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 inline-block h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
        )}
        {showDropdown && dropdown(results.length > 0)}
      </div>
    );
  }

  /* ── Variant: inline (document body — click-to-edit) ── */
  if (editing) {
    return (
      <div ref={containerRef} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditing(false);
              setQuery("");
              setResults([]);
            } else if (e.key === "Enter") {
              saveFreetext(query);
            }
          }}
          placeholder="Buscar consignatario..."
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:outline-none"
        />
        {dropdown(results.length > 0)}
        {isPending && (
          <span className="absolute right-2 top-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
        )}
      </div>
    );
  }

  const enterEditing = () => {
    setQuery(displayName ?? "");
    setEditing(true);
  };

  return (
    <span
      tabIndex={0}
      role="button"
      onFocus={enterEditing}
      className={`cursor-pointer border-b border-dashed border-blue-300 transition-all print:border-0 print:cursor-default ${
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
