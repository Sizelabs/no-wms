"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { inputClass } from "@/components/ui/form-section";
import { createShipment, createShipmentWithSIs } from "@/lib/actions/shipments";
import { extractModalityCode, getDocumentType, SHIPMENT_MODALITY_TO_DOC_TYPE } from "@/lib/shipping-utils";

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

interface UnassignedSI {
  id: string;
  si_number: string;
  modality: string | null;
  modalities: unknown;
  agency_id: string;
  agencies: { name: string; code: string } | { name: string; code: string }[] | null;
  destination_id: string | null;
  total_pieces: number | null;
  total_billable_weight_lb: number | null;
  created_at: string;
}

interface ShipmentCreateFormProps {
  warehouses: Warehouse[];
  destinations: Destination[];
  carriers: Carrier[];
  agencies: Agency[];
  unassignedSIs: UnassignedSI[];
}

export function ShipmentCreateForm({ warehouses, destinations, carriers, agencies, unassignedSIs }: ShipmentCreateFormProps) {
  const { notify } = useNotification();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modality, setModality] = useState<"air" | "ocean" | "ground">("air");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [agentId, setAgentId] = useState("");

  // Common
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

  // SI selection
  const [selectedSiIds, setSelectedSiIds] = useState<Set<string>>(new Set());

  const filteredCarriers = carriers.filter((c) => c.modality === modality);

  // Filter SIs by current modality
  const filteredSIs = useMemo(() => {
    const expectedDocType = SHIPMENT_MODALITY_TO_DOC_TYPE[modality];
    return unassignedSIs.filter((si) => {
      const code = extractModalityCode(si);
      return getDocumentType(code) === expectedDocType;
    });
  }, [unassignedSIs, modality]);

  // Clear SI selections that don't match when modality changes
  const handleModalityChange = (m: "air" | "ocean" | "ground") => {
    setModality(m);
    setCarrierId("");
    setSelectedSiIds(new Set());
  };

  const toggleSi = (id: string) => {
    setSelectedSiIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSiIds.size === filteredSIs.length) {
      setSelectedSiIds(new Set());
    } else {
      setSelectedSiIds(new Set(filteredSIs.map((si) => si.id)));
    }
  };

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

      // Air
      if (modality === "air") {
        if (awbNumber) fd.set("awb_number", awbNumber);
        if (bookingNumber) fd.set("booking_number", bookingNumber);
        if (flightNumber) fd.set("flight_number", flightNumber);
        if (departureAirport) fd.set("departure_airport", departureAirport);
        if (arrivalAirport) fd.set("arrival_airport", arrivalAirport);
        if (departureDate) fd.set("departure_date", departureDate);
        if (arrivalDate) fd.set("arrival_date", arrivalDate);
      }

      // Ocean
      if (modality === "ocean") {
        if (bolNumber) fd.set("bol_number", bolNumber);
        if (portOfLoading) fd.set("port_of_loading", portOfLoading);
        if (vesselName) fd.set("vessel_name", vesselName);
        if (voyageId) fd.set("voyage_id", voyageId);
        if (portOfUnloading) fd.set("port_of_unloading", portOfUnloading);
        if (freightTerms) fd.set("freight_terms", freightTerms);
      }

      // Ground
      if (modality === "ground") {
        if (routeNumber) fd.set("route_number", routeNumber);
        if (originTerminal) fd.set("origin_terminal", originTerminal);
        if (destinationTerminal) fd.set("destination_terminal", destinationTerminal);
        if (truckPlate) fd.set("truck_plate", truckPlate);
        if (driverName) fd.set("driver_name", driverName);
        if (driverPhone) fd.set("driver_phone", driverPhone);
      }

      const siIds = [...selectedSiIds];
      const res = siIds.length > 0
        ? await createShipmentWithSIs(fd, siIds)
        : await createShipment(fd);

      if ("error" in res) {
        notify(res.error, "error");
      } else {
        const siCount = siIds.length;
        notify(
          <span>
            Embarque{" "}
            <Link href={`/${locale}/shipments/${res.id}`} className="font-medium underline hover:text-gray-600">
              {res.shipment_number}
            </Link>{" "}
            creado{siCount > 0 ? ` con ${siCount} SI${siCount > 1 ? "s" : ""}` : ""}
          </span>,
          "success",
        );
        router.push(`shipments/${res.id}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Modality selector */}
      <div className="flex gap-1 rounded-lg border p-1">
        {(["air", "ocean", "ground"] as const).map((m) => (
          <button
            key={m}
            onClick={() => handleModalityChange(m)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              modality === m
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {m === "air" ? "Aéreo" : m === "ocean" ? "Marítimo" : "Terrestre"}
          </button>
        ))}
      </div>

      {/* Common fields */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Bodega *</label>
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
          <label className="block text-sm font-medium text-gray-700">Transportista</label>
          <div className="mt-1">
            <Combobox
              options={filteredCarriers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
              value={carrierId}
              onChange={setCarrierId}
              placeholder="Seleccionar transportista"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Agente destino</label>
          <div className="mt-1">
            <Combobox
              options={agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
              value={agentId}
              onChange={setAgentId}
              placeholder="Seleccionar agente"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Remitente</label>
          <input type="text" value={shipperName} onChange={(e) => setShipperName(e.target.value)} className={`mt-1 ${inputClass}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Consignatario</label>
          <input type="text" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} className={`mt-1 ${inputClass}`} />
        </div>
      </div>

      {/* Air-specific fields */}
      {modality === "air" && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">Datos Aéreos</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">AWB</label>
              <input type="text" value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} placeholder="Auto-asignado si hay lote" className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Booking #</label>
              <input type="text" value={bookingNumber} onChange={(e) => setBookingNumber(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vuelo</label>
              <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="LA-601" className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Aeropuerto origen</label>
              <input type="text" value={departureAirport} onChange={(e) => setDepartureAirport(e.target.value)} placeholder="GYE" className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Aeropuerto destino</label>
              <input type="text" value={arrivalAirport} onChange={(e) => setArrivalAirport(e.target.value)} placeholder="PTY" className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha salida</label>
              <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha llegada</label>
              <input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
          </div>
        </div>
      )}

      {/* Ocean-specific fields */}
      {modality === "ocean" && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">Datos Marítimos</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">BOL #</label>
              <input type="text" value={bolNumber} onChange={(e) => setBolNumber(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Puerto de carga</label>
              <input type="text" value={portOfLoading} onChange={(e) => setPortOfLoading(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Buque</label>
              <input type="text" value={vesselName} onChange={(e) => setVesselName(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Viaje ID</label>
              <input type="text" value={voyageId} onChange={(e) => setVoyageId(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Puerto de descarga</label>
              <input type="text" value={portOfUnloading} onChange={(e) => setPortOfUnloading(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Flete</label>
              <select value={freightTerms} onChange={(e) => setFreightTerms(e.target.value)} className={`mt-1 ${inputClass}`}>
                <option value="">—</option>
                <option value="prepaid">Prepagado</option>
                <option value="collect">Por Cobrar</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Ground-specific fields */}
      {modality === "ground" && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">Datos Terrestres</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ruta #</label>
              <input type="text" value={routeNumber} onChange={(e) => setRouteNumber(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Terminal origen</label>
              <input type="text" value={originTerminal} onChange={(e) => setOriginTerminal(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Terminal destino</label>
              <input type="text" value={destinationTerminal} onChange={(e) => setDestinationTerminal(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Placa</label>
              <input type="text" value={truckPlate} onChange={(e) => setTruckPlate(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Conductor</label>
              <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono conductor</label>
              <input type="text" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Notas</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`mt-1 ${inputClass}`} />
      </div>

      {/* SI selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            SIs a cargar
            {selectedSiIds.size > 0 && (
              <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-gray-900 px-1.5 text-[10px] font-bold text-white">
                {selectedSiIds.size}
              </span>
            )}
          </h3>
          {filteredSIs.length > 0 && (
            <span className="text-xs text-gray-500">
              {filteredSIs.length} SI{filteredSIs.length !== 1 ? "s" : ""} disponible{filteredSIs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {filteredSIs.length === 0 ? (
          <p className="text-sm text-gray-500">No hay SIs finalizadas disponibles para esta modalidad.</p>
        ) : (
          <div className="overflow-auto rounded-lg border max-h-72">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedSiIds.size === filteredSIs.length}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-3 py-2">SI #</th>
                  <th className="px-3 py-2">Agencia</th>
                  <th className="px-3 py-2 text-right">Pzas</th>
                  <th className="px-3 py-2 text-right">Peso (lb)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSIs.map((si) => (
                  <tr
                    key={si.id}
                    onClick={() => toggleSi(si.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedSiIds.has(si.id)
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedSiIds.has(si.id)}
                        onChange={() => toggleSi(si.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{si.si_number}</td>
                    <td className="px-3 py-2 text-xs">
                      {(Array.isArray(si.agencies) ? si.agencies[0]?.name : si.agencies?.name) ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-right">{si.total_pieces ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-right">
                      {si.total_billable_weight_lb
                        ? Number(si.total_billable_weight_lb).toFixed(1)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isPending || !warehouseId}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear Embarque"}
        </button>
      </div>
    </div>
  );
}
