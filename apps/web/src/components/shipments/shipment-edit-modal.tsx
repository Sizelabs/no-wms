"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { AirportCombobox } from "@/components/ui/airport-combobox";
import { Combobox } from "@/components/ui/combobox";
import { inputClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { getCarriers } from "@/lib/actions/carriers";
import { getDestinationsList } from "@/lib/actions/destinations";
import { updateShipment } from "@/lib/actions/shipments";
import { SHIPMENT_MODALITY_TO_CODES } from "@/lib/shipping-utils";
import { createClient } from "@/lib/supabase/client";
import type { ShipmentDetail } from "@/lib/types/shipments";

interface Carrier {
  id: string;
  code: string;
  name: string;
  modalities: { id: string; code: string; name: string }[];
}

interface ShipmentEditModalProps {
  open: boolean;
  onClose: () => void;
  shipment: ShipmentDetail;
}

export function ShipmentEditModal({ open, onClose, shipment }: ShipmentEditModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  // Reference data (lazy-loaded)
  const [destinations, setDestinations] = useState<{ id: string; city: string; country_code: string }[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Common fields
  const [destinationId, setDestinationId] = useState(shipment.destination_id ?? "");
  const [carrierId, setCarrierId] = useState(shipment.carrier_id ?? "");
  const [agentId, setAgentId] = useState(shipment.destination_agent_id ?? "");
  const [shipperName, setShipperName] = useState(shipment.shipper_name ?? "");
  const [shipperAddress, setShipperAddress] = useState(shipment.shipper_address ?? "");
  const [consigneeName, setConsigneeName] = useState(shipment.consignee_name ?? "");
  const [consigneeAddress, setConsigneeAddress] = useState(shipment.consignee_address ?? "");
  const [notes, setNotes] = useState(shipment.notes ?? "");

  // Air
  const [awbNumber, setAwbNumber] = useState(shipment.awb_number ?? "");
  const [bookingNumber, setBookingNumber] = useState(shipment.booking_number ?? "");
  const [flightNumber, setFlightNumber] = useState(shipment.flight_number ?? "");
  const [departureAirport, setDepartureAirport] = useState(shipment.departure_airport ?? "");
  const [arrivalAirport, setArrivalAirport] = useState(shipment.arrival_airport ?? "");
  const [departureDate, setDepartureDate] = useState(shipment.departure_date ?? "");
  const [arrivalDate, setArrivalDate] = useState(shipment.arrival_date ?? "");

  // Ocean
  const [bolNumber, setBolNumber] = useState(shipment.bol_number ?? "");
  const [portOfLoading, setPortOfLoading] = useState(shipment.port_of_loading ?? "");
  const [vesselName, setVesselName] = useState(shipment.vessel_name ?? "");
  const [voyageId, setVoyageId] = useState(shipment.voyage_id ?? "");
  const [portOfUnloading, setPortOfUnloading] = useState(shipment.port_of_unloading ?? "");
  const [freightTerms, setFreightTerms] = useState(shipment.freight_terms ?? "");

  // Ground
  const [routeNumber, setRouteNumber] = useState(shipment.route_number ?? "");
  const [originTerminal, setOriginTerminal] = useState(shipment.origin_terminal ?? "");
  const [destinationTerminal, setDestinationTerminal] = useState(shipment.destination_terminal ?? "");
  const [truckPlate, setTruckPlate] = useState(shipment.truck_plate ?? "");
  const [driverName, setDriverName] = useState(shipment.driver_name ?? "");
  const [driverPhone, setDriverPhone] = useState(shipment.driver_phone ?? "");

  const modality = shipment.modality as "air" | "ocean" | "ground";

  // Reset form state when shipment changes
  useEffect(() => {
    setDestinationId(shipment.destination_id ?? "");
    setCarrierId(shipment.carrier_id ?? "");
    setAgentId(shipment.destination_agent_id ?? "");
    setShipperName(shipment.shipper_name ?? "");
    setShipperAddress(shipment.shipper_address ?? "");
    setConsigneeName(shipment.consignee_name ?? "");
    setConsigneeAddress(shipment.consignee_address ?? "");
    setNotes(shipment.notes ?? "");
    setAwbNumber(shipment.awb_number ?? "");
    setBookingNumber(shipment.booking_number ?? "");
    setFlightNumber(shipment.flight_number ?? "");
    setDepartureAirport(shipment.departure_airport ?? "");
    setArrivalAirport(shipment.arrival_airport ?? "");
    setDepartureDate(shipment.departure_date ?? "");
    setArrivalDate(shipment.arrival_date ?? "");
    setBolNumber(shipment.bol_number ?? "");
    setPortOfLoading(shipment.port_of_loading ?? "");
    setVesselName(shipment.vessel_name ?? "");
    setVoyageId(shipment.voyage_id ?? "");
    setPortOfUnloading(shipment.port_of_unloading ?? "");
    setFreightTerms(shipment.freight_terms ?? "");
    setRouteNumber(shipment.route_number ?? "");
    setOriginTerminal(shipment.origin_terminal ?? "");
    setDestinationTerminal(shipment.destination_terminal ?? "");
    setTruckPlate(shipment.truck_plate ?? "");
    setDriverName(shipment.driver_name ?? "");
    setDriverPhone(shipment.driver_phone ?? "");
  }, [shipment]);

  // Lazy-load reference data on first open
  useEffect(() => {
    if (!open || loaded) return;

    const supabase = createClient();

    Promise.all([
      getDestinationsList(),
      getCarriers(),
      supabase.from("agencies").select("id, name, code").eq("is_active", true).order("name"),
    ]).then(([destResult, carrierResult, agencyResult]) => {
      if (destResult.data) {
        setDestinations(destResult.data.map((d) => ({ id: d.id, city: d.city, country_code: d.country_code })));
      }
      if (carrierResult.data) setCarriers(carrierResult.data);
      if (agencyResult.data) setAgencies(agencyResult.data);
      setLoaded(true);
    });
  }, [open, loaded]);

  const matchingCodes = SHIPMENT_MODALITY_TO_CODES[modality] ?? [];
  const filteredCarriers = carriers.filter((c) =>
    c.modalities.some((m) => matchingCodes.includes(m.code)),
  );

  const handleSubmit = () => {
    startTransition(async () => {
      const fd = new FormData();
      if (destinationId) fd.set("destination_id", destinationId);
      if (carrierId) fd.set("carrier_id", carrierId);
      if (agentId) fd.set("destination_agent_id", agentId);
      if (shipperName) fd.set("shipper_name", shipperName);
      if (shipperAddress) fd.set("shipper_address", shipperAddress);
      if (consigneeName) fd.set("consignee_name", consigneeName);
      if (consigneeAddress) fd.set("consignee_address", consigneeAddress);
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

      const res = await updateShipment(shipment.id, fd);

      if (res.error) {
        notify(res.error, "error");
      } else {
        notify("Embarque actualizado", "success");
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>Editar Embarque {shipment.shipment_number}</ModalHeader>
      <ModalBody>
        <div className="space-y-5">
          {/* Common fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">Destino</label>
              <Combobox
                options={destinations.map((d) => ({ value: d.id, label: `${d.city} (${d.country_code})` }))}
                value={destinationId}
                onChange={setDestinationId}
                placeholder="Seleccionar destino"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">Transportista</label>
              <Combobox
                options={filteredCarriers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                value={carrierId}
                onChange={setCarrierId}
                placeholder="Seleccionar transportista"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">Agente destino</label>
              <Combobox
                options={agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
                value={agentId}
                onChange={setAgentId}
                placeholder="Seleccionar agente"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">Remitente</label>
              <input type="text" value={shipperName} onChange={(e) => setShipperName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">Dir. Remitente</label>
              <input type="text" value={shipperAddress} onChange={(e) => setShipperAddress(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">Consignatario</label>
              <input type="text" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">Dir. Consignatario</label>
              <input type="text" value={consigneeAddress} onChange={(e) => setConsigneeAddress(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Air-specific fields */}
          {modality === "air" && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">Datos Aereos</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">AWB</label>
                  <input type="text" value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Booking #</label>
                  <input type="text" value={bookingNumber} onChange={(e) => setBookingNumber(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Vuelo</label>
                  <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="LA-601" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Aeropuerto origen</label>
                  <AirportCombobox value={departureAirport} onChange={setDepartureAirport} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Aeropuerto destino</label>
                  <AirportCombobox value={arrivalAirport} onChange={setArrivalAirport} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Fecha salida</label>
                  <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Fecha llegada</label>
                  <input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} className={inputClass} />
                </div>
              </div>
            </fieldset>
          )}

          {/* Ocean-specific fields */}
          {modality === "ocean" && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">Datos Maritimos</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">BOL #</label>
                  <input type="text" value={bolNumber} onChange={(e) => setBolNumber(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Puerto de carga</label>
                  <input type="text" value={portOfLoading} onChange={(e) => setPortOfLoading(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Buque</label>
                  <input type="text" value={vesselName} onChange={(e) => setVesselName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Viaje ID</label>
                  <input type="text" value={voyageId} onChange={(e) => setVoyageId(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Puerto de descarga</label>
                  <input type="text" value={portOfUnloading} onChange={(e) => setPortOfUnloading(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Flete</label>
                  <select value={freightTerms} onChange={(e) => setFreightTerms(e.target.value)} className={inputClass}>
                    <option value="">--</option>
                    <option value="prepaid">Prepagado</option>
                    <option value="collect">Por Cobrar</option>
                  </select>
                </div>
              </div>
            </fieldset>
          )}

          {/* Ground-specific fields */}
          {modality === "ground" && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">Datos Terrestres</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Ruta #</label>
                  <input type="text" value={routeNumber} onChange={(e) => setRouteNumber(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Terminal origen</label>
                  <input type="text" value={originTerminal} onChange={(e) => setOriginTerminal(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Terminal destino</label>
                  <input type="text" value={destinationTerminal} onChange={(e) => setDestinationTerminal(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Placa</label>
                  <input type="text" value={truckPlate} onChange={(e) => setTruckPlate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Conductor</label>
                  <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Telefono conductor</label>
                  <input type="text" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} className={inputClass} />
                </div>
              </div>
            </fieldset>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm text-gray-600">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </ModalFooter>
    </Modal>
  );
}
