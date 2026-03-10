"use client";

import { buildStorageCode } from "@no-wms/shared/utils/location-barcode";
import { Grid3X3, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass, primaryBtnClass, secondaryBtnClass, Field } from "@/components/ui/form-section";
import { bulkCreateStorageLocations } from "@/lib/actions/location-management";

interface Props {
  zoneId: string;
  onDone: () => void;
  onCancel: () => void;
}

export function BulkGenerator({ zoneId, onDone, onCancel }: Props) {
  const [aisles, setAisles] = useState("A");
  const [racksPerAisle, setRacksPerAisle] = useState(3);
  const [shelvesPerRack, setShelvesPerRack] = useState(3);
  const [positionsPerShelf, setPositionsPerShelf] = useState(2);
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();

  const totalCount = useMemo(() => {
    const aisleList = aisles.split(",").filter((a) => /^[A-Z]$/.test(a.trim()));
    return aisleList.length * racksPerAisle * shelvesPerRack * positionsPerShelf;
  }, [aisles, racksPerAisle, shelvesPerRack, positionsPerShelf]);

  const sampleCodes = useMemo(() => {
    const aisleList = aisles.split(",").filter((a) => /^[A-Z]$/.test(a.trim()));
    const samples: string[] = [];
    for (const aisle of aisleList.slice(0, 2)) {
      samples.push(buildStorageCode(aisle.trim(), 1, 1, 1));
      if (racksPerAisle > 1) {
        samples.push(buildStorageCode(aisle.trim(), 2, 1, 1));
      }
    }
    return samples.slice(0, 4);
  }, [aisles, racksPerAisle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await bulkCreateStorageLocations({
        zone_id: zoneId,
        aisles: aisles.split(",").map((a) => a.trim()).filter((a) => /^[A-Z]$/.test(a)).join(","),
        racks_per_aisle: racksPerAisle,
        shelves_per_rack: shelvesPerRack,
        positions_per_shelf: positionsPerShelf,
      });
      if (result.error) {
        notify(result.error, "error");
        return;
      }
      notify(`${result.data?.count ?? 0} ubicaciones creadas`, "success");
      onDone();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Generar ubicaciones</h3>
          </div>
          <button type="button" onClick={onCancel} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <Field label="Pasillos" required hint="Letras A-Z separadas por coma (ej: A,B,C)">
            <input
              className={inputClass}
              value={aisles}
              onChange={(e) => setAisles(e.target.value.toUpperCase())}
              placeholder="A,B,C"
              required
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Racks/pasillo">
              <input type="number" className={inputClass} value={racksPerAisle} onChange={(e) => setRacksPerAisle(Number(e.target.value))} min={1} max={99} />
            </Field>
            <Field label="Niveles/rack">
              <input type="number" className={inputClass} value={shelvesPerRack} onChange={(e) => setShelvesPerRack(Number(e.target.value))} min={1} max={20} />
            </Field>
            <Field label="Pos./nivel">
              <input type="number" className={inputClass} value={positionsPerShelf} onChange={(e) => setPositionsPerShelf(Number(e.target.value))} min={1} max={20} />
            </Field>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">Vista previa</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{totalCount} ubicaciones</p>
            {sampleCodes.length > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Ejemplo: {sampleCodes.join(", ")}...
              </p>
            )}
            {totalCount > 5000 && (
              <p className="mt-1 text-xs text-red-500">Máximo 5000 ubicaciones por generación</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={secondaryBtnClass} onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className={primaryBtnClass} disabled={isPending || totalCount === 0 || totalCount > 5000}>
              {isPending ? "Generando..." : `Crear ${totalCount} ubicaciones`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
