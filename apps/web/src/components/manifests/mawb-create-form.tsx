"use client";

import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { inputClass } from "@/components/ui/form-section";
import { createMawb } from "@/lib/actions/manifests";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Destination {
  id: string;
  city: string;
  country_code: string;
}

interface MawbCreateFormProps {
  warehouses: Warehouse[];
  destinations: Destination[];
}

export function MawbCreateForm({ warehouses, destinations }: MawbCreateFormProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? "");
  const [mawbNumber, setMawbNumber] = useState("");
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState("");

  const handleSubmit = () => {
    if (!mawbNumber || !airline || !warehouseId || !destinationId) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("warehouse_id", warehouseId);
      fd.set("destination_id", destinationId);
      fd.set("mawb_number", mawbNumber);
      fd.set("airline", airline);
      if (flightNumber) fd.set("flight_number", flightNumber);
      if (flightDate) fd.set("flight_date", flightDate);

      const res = await createMawb(fd);
      if ("error" in res) {
        notify(res.error, "error");
      } else {
        notify("MAWB creado exitosamente", "success");
        setMawbNumber("");
        setFlightNumber("");
        setFlightDate("");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Número MAWB *</label>
          <input
            type="text"
            value={mawbNumber}
            onChange={(e) => setMawbNumber(e.target.value)}
            placeholder="906-13203201"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Aerolínea *</label>
          <input
            type="text"
            value={airline}
            onChange={(e) => setAirline(e.target.value)}
            placeholder="LATAM, Avianca..."
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bodega</label>
          <div className="mt-1">
            <Combobox
              options={warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
              value={warehouseId}
              onChange={setWarehouseId}
              disabled={warehouses.length <= 1}
              placeholder="Seleccionar bodega"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Destino</label>
          <div className="mt-1">
            <Combobox
              options={destinations.map((d) => ({ value: d.id, label: `${d.city} (${d.country_code})` }))}
              value={destinationId}
              onChange={setDestinationId}
              placeholder="Seleccionar destino"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Número de vuelo</label>
          <input
            type="text"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            placeholder="LA-601"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha de vuelo</label>
          <input
            type="date"
            value={flightDate}
            onChange={(e) => setFlightDate(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isPending || !mawbNumber || !airline}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear MAWB"}
        </button>
      </div>
    </div>
  );
}
