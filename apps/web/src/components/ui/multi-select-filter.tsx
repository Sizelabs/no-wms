"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Optimistic local state for instant checkbox feedback
  const [local, setLocal] = useState(selected);
  const selectedKey = selected.join(",");
  useEffect(() => {
    setLocal(selected);
  }, [selectedKey]); // selected identity changes often; key is stable

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = useCallback(
    (value: string) => {
      const next = local.includes(value)
        ? local.filter((v) => v !== value)
        : [...local, value];
      setLocal(next);
      onChange(next);
    },
    [local, onChange],
  );

  const clear = useCallback(() => {
    setLocal([]);
    onChange([]);
  }, [onChange]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors focus:outline-none ${
          local.length > 0
            ? "border-gray-900 bg-gray-50 text-gray-900"
            : "border-gray-200 bg-white text-gray-900"
        }`}
      >
        <span>{label}</span>
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[11px] font-medium text-white transition-opacity ${
            local.length > 0 ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={local.length === 0}
        >
          {Math.max(local.length, 1)}
        </span>
        <svg className={`h-4 w-4 shrink-0 ${local.length > 0 ? "text-gray-900" : "text-gray-400"}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={local.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
              />
              {opt.label}
            </label>
          ))}
          {local.length > 0 && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={clear}
                className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-gray-50"
              >
                Limpiar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
