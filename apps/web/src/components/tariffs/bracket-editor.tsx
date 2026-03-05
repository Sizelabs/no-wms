"use client";

import { useState } from "react";

import { inputClass } from "@/components/ui/form-section";

export interface BracketRow {
  min_weight: number;
  max_weight: number;
  rate_per_unit: number;
  minimum_charge: number;
}

interface BracketEditorProps {
  value: BracketRow[];
  onChange: (brackets: BracketRow[]) => void;
  weightUnit?: string;
  readOnly?: boolean;
}

export function BracketEditor({ value, onChange, weightUnit = "kg", readOnly }: BracketEditorProps) {
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    const lastMax = value.length > 0 ? value[value.length - 1]!.max_weight : 0;
    onChange([...value, { min_weight: lastMax, max_weight: lastMax + 10, rate_per_unit: 0, minimum_charge: 0 }]);
    setError(null);
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setError(null);
  };

  const updateRow = (index: number, field: keyof BracketRow, val: number) => {
    const updated = value.map((row, i) => (i === index ? { ...row, [field]: val } : row));

    // Validate no overlaps
    const sorted = [...updated].sort((a, b) => a.min_weight - b.min_weight);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]!.min_weight < sorted[i - 1]!.max_weight) {
        setError(`Superposición entre rangos ${i} y ${i + 1}`);
        onChange(updated);
        return;
      }
    }
    setError(null);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Rangos de Peso</h4>
        {!readOnly && (
          <button
            type="button"
            onClick={addRow}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            + Agregar rango
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">Mín ({weightUnit})</th>
              <th className="px-3 py-2">Máx ({weightUnit})</th>
              <th className="px-3 py-2">Tarifa/{weightUnit}</th>
              <th className="px-3 py-2">Cargo mín.</th>
              {!readOnly && <th className="px-3 py-2 w-16"></th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {value.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-xs">{row.min_weight}</span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.min_weight}
                      onChange={(e) => updateRow(i, "min_weight", parseFloat(e.target.value) || 0)}
                      className={`${inputClass} !h-8 !text-xs`}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-xs">{row.max_weight}</span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.max_weight}
                      onChange={(e) => updateRow(i, "max_weight", parseFloat(e.target.value) || 0)}
                      className={`${inputClass} !h-8 !text-xs`}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-xs">${row.rate_per_unit.toFixed(4)}</span>
                  ) : (
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={row.rate_per_unit}
                      onChange={(e) => updateRow(i, "rate_per_unit", parseFloat(e.target.value) || 0)}
                      className={`${inputClass} !h-8 !text-xs`}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-xs">{row.minimum_charge > 0 ? `$${row.minimum_charge.toFixed(2)}` : "—"}</span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.minimum_charge}
                      onChange={(e) => updateRow(i, "minimum_charge", parseFloat(e.target.value) || 0)}
                      className={`${inputClass} !h-8 !text-xs`}
                    />
                  )}
                </td>
                {!readOnly && (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Quitar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {value.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 4 : 5} className="px-3 py-4 text-center text-xs text-gray-400">
                  Sin rangos de peso configurados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
