"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";

interface EditableFieldProps {
  value: string | number | null;
  onSave: (newValue: string) => Promise<{ error?: string }>;
  type?: "text" | "textarea" | "number" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  emptyText?: string;
  disabled?: boolean;
  formatDisplay?: (v: string | number | null) => string;
}

export function EditableField({
  value,
  onSave,
  type = "text",
  options,
  placeholder,
  className = "",
  inputClassName = "",
  emptyText = "—",
  disabled = false,
  formatDisplay,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value ?? ""));
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const { notify } = useNotification();

  useEffect(() => {
    setDisplayValue(value);
    setLocalValue(String(value ?? ""));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLSelectElement) {
        try { inputRef.current.showPicker(); } catch {}
      } else if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  const handleSave = useCallback(() => {
    const newVal = localValue.trim();
    const oldVal = String(displayValue ?? "");
    if (newVal === oldVal) {
      setEditing(false);
      return;
    }

    setDisplayValue(newVal || null);
    setEditing(false);

    startTransition(async () => {
      const result = await onSave(newVal);
      if (result.error) {
        setDisplayValue(value);
        setLocalValue(String(value ?? ""));
        notify(result.error, "error");
      } else {
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      }
    });
  }, [localValue, displayValue, onSave, value, notify]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocalValue(String(displayValue ?? ""));
        setEditing(false);
      } else if (e.key === "Enter" && type !== "textarea") {
        handleSave();
      }
    },
    [handleSave, displayValue, type],
  );

  if (disabled) {
    const text = formatDisplay ? formatDisplay(displayValue) : String(displayValue ?? "");
    return <span className={className}>{text || emptyText}</span>;
  }

  if (editing) {
    const widthClass = inputClassName || (type === "number" ? "w-20" : "");
    const inputBase = `rounded-md border border-slate-300 bg-white px-2 py-0.5 text-inherit shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:outline-none ${widthClass}`;

    if (type === "select" && options) {
      return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement | null>}
            value={localValue}
            onChange={(e) => {
              const newVal = e.target.value;
              setLocalValue(newVal);
              setDisplayValue(newVal || null);
              setEditing(false);
              startTransition(async () => {
                const result = await onSave(newVal);
                if (result.error) {
                  setDisplayValue(value);
                  setLocalValue(String(value ?? ""));
                  notify(result.error, "error");
                } else {
                  setFlash(true);
                  setTimeout(() => setFlash(false), 800);
                }
              });
            }}
            onBlur={() => {
              setLocalValue(String(displayValue ?? ""));
              setEditing(false);
            }}
            onKeyDown={handleKeyDown}
            className={inputBase}
          >
            <option value="">— Sin asignar —</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </span>
      );
    }

    if (type === "textarea") {
      return (
        <span className={`block ${className}`}>
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement | null>}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setLocalValue(String(displayValue ?? ""));
                setEditing(false);
              } else if (e.key === "Tab") {
                // Let Tab navigate instead of inserting a tab character
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
            rows={3}
            placeholder={placeholder}
            className={`${inputBase} w-full`}
          />
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement | null>}
          type={type === "number" ? "number" : "text"}
          step={type === "number" ? "any" : undefined}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputBase}
        />
      </span>
    );
  }

  const text = formatDisplay ? formatDisplay(displayValue) : String(displayValue ?? "");
  const isEmpty = !text;

  const enterEditing = () => {
    setLocalValue(String(displayValue ?? ""));
    setEditing(true);
  };

  return (
    <span
      tabIndex={0}
      role="button"
      onFocus={enterEditing}
      className={`cursor-pointer border-b border-dashed border-blue-300 transition-all print:border-0 print:cursor-default ${
        isPending
          ? "animate-pulse text-blue-400"
          : flash
            ? "text-emerald-600"
            : isEmpty
              ? "italic text-slate-400"
              : ""
      } ${className}`}
    >
      {isEmpty ? emptyText : text}
    </span>
  );
}
