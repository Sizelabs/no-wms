"use client";

import type { ConditionFlag } from "@no-wms/shared/constants/condition-flags";
import {
  CONDITION_FLAGS,
  CONDITION_FLAG_LABELS_ES,
} from "@no-wms/shared/constants/condition-flags";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { updateWarehouseReceiptField } from "@/lib/actions/warehouse-receipts";

const FLAG_STYLES: Record<ConditionFlag, { bg: string; dot: string; text: string }> = {
  sin_novedad:       { bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700" },
  caja_danada:       { bg: "bg-amber-50",   dot: "bg-amber-500",   text: "text-amber-700" },
  caja_abierta:      { bg: "bg-amber-50",   dot: "bg-amber-500",   text: "text-amber-700" },
  cinta_rota:        { bg: "bg-amber-50",   dot: "bg-amber-500",   text: "text-amber-700" },
  caja_mojada:       { bg: "bg-red-50",     dot: "bg-red-500",     text: "text-red-700" },
  contenido_expuesto:{ bg: "bg-red-50",     dot: "bg-red-500",     text: "text-red-700" },
};

interface ConditionFlagsInlineEditProps {
  wrId: string;
  flags: string[];
  onFlagsChange?: (flags: string[]) => void;
}

export function ConditionFlagsInlineEdit({ wrId, flags, onFlagsChange }: ConditionFlagsInlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [localFlags, setLocalFlags] = useState<string[]>(flags);
  const [flash, setFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotification();

  useEffect(() => {
    setLocalFlags(flags);
  }, [flags]);

  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing]);

  const toggleFlag = useCallback(
    (flag: string) => {
      let newFlags: string[];

      if (flag === "sin_novedad") {
        newFlags = localFlags.includes("sin_novedad") ? [] : ["sin_novedad"];
      } else {
        const withoutSinNovedad = localFlags.filter((f) => f !== "sin_novedad");
        if (withoutSinNovedad.includes(flag)) {
          newFlags = withoutSinNovedad.filter((f) => f !== flag);
        } else {
          newFlags = [...withoutSinNovedad, flag];
        }
      }

      setLocalFlags(newFlags);
      onFlagsChange?.(newFlags);

      startTransition(async () => {
        const result = await updateWarehouseReceiptField(
          wrId,
          "condition_flags",
          JSON.stringify(newFlags),
        );
        if (result.error) {
          setLocalFlags(flags);
          onFlagsChange?.(flags);
          notify(result.error, "error");
        } else {
          setFlash(true);
          setTimeout(() => setFlash(false), 800);
        }
      });
    },
    [localFlags, wrId, flags, notify, onFlagsChange],
  );

  const hasNoExceptions = localFlags.includes("sin_novedad");

  return (
    <div ref={containerRef}>
      {/* Display */}
      <div
        onClick={() => setEditing(!editing)}
        className={`cursor-pointer border-b border-dashed border-transparent transition-colors hover:border-blue-300 print:border-0 print:cursor-default ${
          flash ? "text-green-600" : ""
        }`}
      >
        {localFlags.length === 0 ? (
          <span className="text-[11px] italic text-slate-400">Sin condicion especificada</span>
        ) : hasNoExceptions ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sin novedad / No exceptions noted
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {localFlags.map((f) => {
              const style = FLAG_STYLES[f as ConditionFlag];
              return (
                <span
                  key={f}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    style ? `${style.bg} ${style.text}` : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${style?.dot ?? "bg-slate-400"}`} />
                  {CONDITION_FLAG_LABELS_ES[f as ConditionFlag] ?? f}
                </span>
              );
            })}
          </div>
        )}
        {isPending && (
          <span className="ml-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
        )}
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="mt-2 flex flex-wrap gap-1.5 print:hidden">
          {CONDITION_FLAGS.map((flag) => {
            const isActive = localFlags.includes(flag);
            const style = FLAG_STYLES[flag];
            return (
              <button
                key={flag}
                type="button"
                onClick={() => toggleFlag(flag)}
                className={`rounded-full px-3 py-1 text-[10px] font-medium transition-all ${
                  isActive
                    ? `${style.bg} ${style.text} ring-1 ring-inset ring-current/20`
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                }`}
              >
                {isActive && (
                  <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
                )}
                {CONDITION_FLAG_LABELS_ES[flag]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
