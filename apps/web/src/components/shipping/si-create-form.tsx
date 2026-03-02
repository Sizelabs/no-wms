"use client";

import type { Modality } from "@no-wms/shared/constants/modalities";
import { MODALITY_LABELS, MVP_MODALITIES } from "@no-wms/shared/constants/modalities";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { createShippingInstruction } from "@/lib/actions/shipping-instructions";

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

interface Consignee {
  id: string;
  name: string;
}

interface DestinationCountry {
  id: string;
  name: string;
}

interface WrPackage {
  tracking_number: string;
  carrier: string | null;
}

interface WrOption {
  id: string;
  wr_number: string;
  status: string;
  total_billable_weight_lb: number | null;
  packages?: WrPackage[];
}

interface SiCreateFormProps {
  agencies: Agency[];
  warehouses: Warehouse[];
  consignees: Consignee[];
  destinations: DestinationCountry[];
  availableWrs: WrOption[];
}

export function SiCreateForm({
  agencies,
  warehouses,
  consignees,
  destinations,
  availableWrs,
}: SiCreateFormProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [modality, setModality] = useState<Modality>("courier_a");
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [consigneeId, setConsigneeId] = useState(consignees[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? "");
  const [selectedWrs, setSelectedWrs] = useState<string[]>([]);
  const [cedulaRuc, setCedulaRuc] = useState("");
  const [cupo4x4, setCupo4x4] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const filteredWrs = availableWrs.filter(
    (wr) => wr.status === "received" || wr.status === "in_warehouse",
  );

  const toggleWr = (wrId: string) => {
    setSelectedWrs((prev) =>
      prev.includes(wrId) ? prev.filter((id) => id !== wrId) : [...prev, wrId],
    );
  };

  const totalWeight = filteredWrs
    .filter((wr) => selectedWrs.includes(wr.id))
    .reduce((sum, wr) => sum + (wr.total_billable_weight_lb ?? 0), 0);

  const handleSubmit = () => {
    if (!selectedWrs.length || !agencyId || !consigneeId || !destinationId) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("modality", modality);
      fd.set("warehouse_id", warehouseId);
      fd.set("agency_id", agencyId);
      fd.set("consignee_id", consigneeId);
      fd.set("destination_country_id", destinationId);
      fd.set("warehouse_receipt_ids", JSON.stringify(selectedWrs));
      if (cedulaRuc) fd.set("cedula_ruc", cedulaRuc);
      fd.set("cupo_4x4_used", String(cupo4x4));
      if (specialInstructions) fd.set("special_instructions", specialInstructions);

      const res = await createShippingInstruction(fd);
      if ("error" in res) {
        notify(res.error, "error");
      } else {
        notify("Instrucción de embarque creada", "success");
        setSelectedWrs([]);
        setSpecialInstructions("");
        setCedulaRuc("");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Modalidad</label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value as Modality)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          >
            {MVP_MODALITIES.map((m) => (
              <option key={m} value={m}>
                {MODALITY_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bodega</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            disabled={warehouses.length <= 1}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
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
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Destino</label>
          <select
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          >
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Consignatario</label>
          <select
            value={consigneeId}
            onChange={(e) => setConsigneeId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          >
            {consignees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Cédula / RUC</label>
          <input
            type="text"
            value={cedulaRuc}
            onChange={(e) => setCedulaRuc(e.target.value)}
            placeholder="10 o 13 dígitos"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cupo4x4}
            onChange={(e) => setCupo4x4(e.target.checked)}
            className="rounded border-gray-300"
          />
          Cupo 4x4
        </label>
      </div>

      {/* WR selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Seleccionar WRs ({selectedWrs.length} seleccionados
          {selectedWrs.length > 0 && ` — ${totalWeight.toFixed(2)} lb`})
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
                <span className="font-mono text-xs">{wr.wr_number}</span>
                <span className="text-xs text-gray-500">{wr.packages?.[0]?.tracking_number ?? ""}</span>
                <span className="text-xs text-gray-400">{wr.packages?.[0]?.carrier ?? ""}</span>
                <span className="ml-auto text-xs text-gray-500">
                  {wr.total_billable_weight_lb ? `${wr.total_billable_weight_lb} lb` : "—"}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Instrucciones especiales</label>
        <textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          placeholder="Instrucciones adicionales..."
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isPending || !selectedWrs.length || !agencyId || !consigneeId}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear Instrucción de Embarque"}
        </button>
      </div>
    </div>
  );
}
