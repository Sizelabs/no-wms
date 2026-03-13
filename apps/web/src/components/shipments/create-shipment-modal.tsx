"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { createShipmentWithSIs } from "@/lib/actions/shipments";
import type { SelectedSI } from "@/lib/shipping-utils";
import { getShipmentModality } from "@/lib/shipping-utils";

const MODALITY_LABELS: Record<string, string> = {
  air: "Aéreo",
  ocean: "Marítimo",
  ground: "Terrestre",
};

const MODALITY_COLORS: Record<string, string> = {
  air: "bg-sky-50 text-sky-700",
  ocean: "bg-blue-50 text-blue-700",
  ground: "bg-amber-50 text-amber-700",
};

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

interface Carrier {
  id: string;
  code: string;
  name: string;
  modality: string;
}

interface Agency {
  id: string;
  name: string;
  code: string;
}

interface CreateShipmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedSIs: SelectedSI[];
  warehouses: Warehouse[];
  destinations: Destination[];
  carriers: Carrier[];
  agencies: Agency[];
}

export function CreateShipmentModal({
  open,
  onClose,
  onSuccess,
  selectedSIs,
  warehouses,
  destinations,
  carriers,
  agencies,
}: CreateShipmentModalProps) {
  const { notify } = useNotification();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Derive modality from SI modality code
  const modality = getShipmentModality(selectedSIs[0]?.modality_code ?? "");
  const filteredCarriers = carriers.filter((c) => c.modality === modality);

  // Common
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [shipperName, setShipperName] = useState("");
  const [consigneeName, setConsigneeName] = useState("");
  const [notes, setNotes] = useState("");

  // Air
  const [awbNumber, setAwbNumber] = useState("");
  const [bookingNumber, setBookingNumber] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [departureAirport, setDepartureAirport] = useState("");
  const [arrivalAirport, setArrivalAirport] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");

  // Ocean
  const [bolNumber, setBolNumber] = useState("");
  const [portOfLoading, setPortOfLoading] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [voyageId, setVoyageId] = useState("");
  const [portOfUnloading, setPortOfUnloading] = useState("");
  const [freightTerms, setFreightTerms] = useState("");

  // Ground
  const [routeNumber, setRouteNumber] = useState("");
  const [originTerminal, setOriginTerminal] = useState("");
  const [destinationTerminal, setDestinationTerminal] = useState("");
  const [truckPlate, setTruckPlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  const handleSubmit = () => {
    if (!warehouseId) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("modality", modality);
      fd.set("warehouse_id", warehouseId);
      if (destinationId) fd.set("destination_id", destinationId);
      if (carrierId) fd.set("carrier_id", carrierId);
      if (agentId) fd.set("destination_agent_id", agentId);
      if (shipperName) fd.set("shipper_name", shipperName);
      if (consigneeName) fd.set("consignee_name", consigneeName);
      if (notes) fd.set("notes", notes);

      if (modality === "air") {
        if (awbNumber) fd.set("awb_number", awbNumber);
        if (bookingNumber) fd.set("booking_number", bookingNumber);
        if (flightNumber) fd.set("flight_number", flightNumber);
        if (departureAirport) fd.set("departure_airport", departureAirport);
        if (arrivalAirport) fd.set("arrival_airport", arrivalAirport);
        if (departureDate) fd.set("departure_date", departureDate);
        if (arrivalDate) fd.set("arrival_date", arrivalDate);
      }

      if (modality === "ocean") {
        if (bolNumber) fd.set("bol_number", bolNumber);
        if (portOfLoading) fd.set("port_of_loading", portOfLoading);
        if (vesselName) fd.set("vessel_name", vesselName);
        if (voyageId) fd.set("voyage_id", voyageId);
        if (portOfUnloading) fd.set("port_of_unloading", portOfUnloading);
        if (freightTerms) fd.set("freight_terms", freightTerms);
      }

      if (modality === "ground") {
        if (routeNumber) fd.set("route_number", routeNumber);
        if (originTerminal) fd.set("origin_terminal", originTerminal);
        if (destinationTerminal) fd.set("destination_terminal", destinationTerminal);
        if (truckPlate) fd.set("truck_plate", truckPlate);
        if (driverName) fd.set("driver_name", driverName);
        if (driverPhone) fd.set("driver_phone", driverPhone);
      }

      const res = await createShipmentWithSIs(
        fd,
        selectedSIs.map((si) => si.id),
      );

      if ("error" in res) {
        notify(res.error, "error");
      } else {
        notify("Embarque creado exitosamente", "success");
        onSuccess();
        router.push(`shipments/${res.id}`);
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>
        Crear Embarque{" "}
        <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MODALITY_COLORS[modality] ?? ""}`}>
          {MODALITY_LABELS[modality] ?? modality}
        </span>
      </ModalHeader>
      <ModalBody>
        {/* Selected SIs summary */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            {selectedSIs.length} SI{selectedSIs.length !== 1 && "s"} seleccionada{selectedSIs.length !== 1 && "s"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedSIs.map((si) => (
              <span
                key={si.id}
                className="inline-flex rounded-md border border-gray-200 bg-white px-2 py-0.5 font-mono text-xs text-gray-700"
              >
                {si.si_number}
              </span>
            ))}
          </div>
        </div>

        {/* Common fields */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Bodega" required>
            <Combobox
              options={warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
              value={warehouseId}
              onChange={setWarehouseId}
              disabled={warehouses.length <= 1}
              placeholder="Seleccionar bodega"
            />
          </Field>
          <Field label="Destino">
            <Combobox
              options={destinations.map((d) => ({ value: d.id, label: `${d.city} (${d.country_code})` }))}
              value={destinationId}
              onChange={setDestinationId}
              placeholder="Seleccionar destino"
            />
          </Field>
          <Field label="Transportista">
            <Combobox
              options={filteredCarriers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
              value={carrierId}
              onChange={setCarrierId}
              placeholder="Seleccionar transportista"
            />
          </Field>
          <Field label="Agente destino">
            <Combobox
              options={agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
              value={agentId}
              onChange={setAgentId}
              placeholder="Seleccionar agente"
            />
          </Field>
          <Field label="Remitente">
            <input type="text" value={shipperName} onChange={(e) => setShipperName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Consignatario">
            <input type="text" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} className={inputClass} />
          </Field>
        </div>

        {/* Air-specific fields */}
        {modality === "air" && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-900">Datos Aéreos</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="AWB">
                <input type="text" value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} placeholder="Auto-asignado si hay lote" className={inputClass} />
              </Field>
              <Field label="Booking #">
                <input type="text" value={bookingNumber} onChange={(e) => setBookingNumber(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Vuelo">
                <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="LA-601" className={inputClass} />
              </Field>
              <Field label="Aeropuerto origen">
                <input type="text" value={departureAirport} onChange={(e) => setDepartureAirport(e.target.value)} placeholder="GYE" className={inputClass} />
              </Field>
              <Field label="Aeropuerto destino">
                <input type="text" value={arrivalAirport} onChange={(e) => setArrivalAirport(e.target.value)} placeholder="PTY" className={inputClass} />
              </Field>
              <Field label="Fecha salida">
                <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Fecha llegada">
                <input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} className={inputClass} />
              </Field>
            </div>
          </div>
        )}

        {/* Ocean-specific fields */}
        {modality === "ocean" && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-900">Datos Marítimos</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="BOL #">
                <input type="text" value={bolNumber} onChange={(e) => setBolNumber(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Puerto de carga">
                <input type="text" value={portOfLoading} onChange={(e) => setPortOfLoading(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Buque">
                <input type="text" value={vesselName} onChange={(e) => setVesselName(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Viaje ID">
                <input type="text" value={voyageId} onChange={(e) => setVoyageId(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Puerto de descarga">
                <input type="text" value={portOfUnloading} onChange={(e) => setPortOfUnloading(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Flete">
                <select value={freightTerms} onChange={(e) => setFreightTerms(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  <option value="prepaid">Prepagado</option>
                  <option value="collect">Por Cobrar</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* Ground-specific fields */}
        {modality === "ground" && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-900">Datos Terrestres</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ruta #">
                <input type="text" value={routeNumber} onChange={(e) => setRouteNumber(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Terminal origen">
                <input type="text" value={originTerminal} onChange={(e) => setOriginTerminal(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Terminal destino">
                <input type="text" value={destinationTerminal} onChange={(e) => setDestinationTerminal(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Placa">
                <input type="text" value={truckPlate} onChange={(e) => setTruckPlate(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Conductor">
                <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Teléfono conductor">
                <input type="text" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} className={inputClass} />
              </Field>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mt-4">
          <Field label="Notas">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
          </Field>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !warehouseId}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Creando..." : "Crear Embarque"}
        </button>
      </ModalFooter>
    </Modal>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}
