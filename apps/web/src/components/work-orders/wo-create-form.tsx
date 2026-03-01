"use client";

import type { WorkOrderType } from "@no-wms/shared/constants/work-order-types";
import { WORK_ORDER_TYPE_LABELS } from "@no-wms/shared/constants/work-order-types";
import { useState, useTransition } from "react";

import { createWorkOrder } from "@/lib/actions/work-orders";

interface Agency {
  id: string;
  name: string;
  code: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface WrOption {
  id: string;
  wr_number: string;
  tracking_number: string;
  carrier: string | null;
  status: string;
}

interface WoCreateFormProps {
  agencies: Agency[];
  warehouses: Warehouse[];
  availableWrs: WrOption[];
}

export function WoCreateForm({ agencies, warehouses, availableWrs }: WoCreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<WorkOrderType>("photos");
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [selectedWrs, setSelectedWrs] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  // Pickup fields
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupPerson, setPickupPerson] = useState("");
  const [pickupContact, setPickupContact] = useState("");

  const filteredWrs = availableWrs.filter((wr) =>
    wr.status === "received" || wr.status === "in_warehouse"
  );

  const toggleWr = (wrId: string) => {
    setSelectedWrs((prev) =>
      prev.includes(wrId) ? prev.filter((id) => id !== wrId) : [...prev, wrId],
    );
  };

  const handleSubmit = () => {
    if (!selectedWrs.length || !agencyId || !warehouseId) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", type);
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("warehouse_receipt_ids", JSON.stringify(selectedWrs));
      if (instructions) fd.set("instructions", instructions);

      if (type === "authorize_pickup") {
        fd.set("pickup_date", pickupDate);
        fd.set("pickup_time", pickupTime);
        fd.set("pickup_location", pickupLocation);
        fd.set("pickup_authorized_person", pickupPerson);
        fd.set("pickup_contact_info", pickupContact);
      }

      const res = await createWorkOrder(fd);
      if ("error" in res) {
        setResult({ error: res.error });
      } else {
        setResult({ success: true });
        setSelectedWrs([]);
        setInstructions("");
      }
    });
  };

  return (
    <div className="space-y-4">
      {result?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      )}
      {result?.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Orden de trabajo creada</div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de OT</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as WorkOrderType)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          >
            {Object.entries(WORK_ORDER_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bodega</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Agencia</label>
          <select
            value={agencyId}
            onChange={(e) => setAgencyId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          >
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* WR selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Seleccionar WRs ({selectedWrs.length} seleccionados)
        </label>
        <div className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-white">
          {filteredWrs.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-gray-400">No hay WRs disponibles</p>
          ) : (
            filteredWrs.map((wr) => (
              <label
                key={wr.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedWrs.includes(wr.id)}
                  onChange={() => toggleWr(wr.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs font-mono">{wr.wr_number}</span>
                <span className="text-xs text-gray-500">{wr.tracking_number}</span>
                <span className="text-xs text-gray-400">{wr.carrier ?? ""}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Instrucciones</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          placeholder="Instrucciones para el operario..."
        />
      </div>

      {/* Pickup fields */}
      {type === "authorize_pickup" && (
        <div className="grid gap-4 rounded-md border bg-gray-50 p-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha de retiro *</label>
            <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hora</label>
            <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ubicación *</label>
            <input type="text" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Persona autorizada *</label>
            <input type="text" value={pickupPerson} onChange={(e) => setPickupPerson(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Contacto</label>
            <input type="text" value={pickupContact} onChange={(e) => setPickupContact(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isPending || !selectedWrs.length || !agencyId}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear Orden de Trabajo"}
        </button>
      </div>
    </div>
  );
}
