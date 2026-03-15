"use client";

import Link from "next/link";
import { useState } from "react";

import { ContainerPanel } from "@/components/shipments/container-panel";
import { ShipmentEditModal } from "@/components/shipments/shipment-edit-modal";
import { InfoField } from "@/components/ui/info-field";
import { HouseBillAssignmentPanel } from "@/components/shipments/house-bill-assignment-panel";
import { ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { getNextShipmentStatus, getShipmentStatusLabel, useAdvanceShipmentStatus } from "@/hooks/use-advance-shipment-status";
import { MODALITY_LABELS } from "@/lib/constants/modalities";
import type { ShipmentDetail as ShipmentData } from "@/lib/types/shipments";

interface ShipmentDetailProps {
  shipment: ShipmentData;
}

export function ShipmentDetail({ shipment }: ShipmentDetailProps) {
  const { advance, isPending } = useAdvanceShipmentStatus();
  const [editOpen, setEditOpen] = useState(false);

  const nextStatus = getNextShipmentStatus(shipment.modality, shipment.status);

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShipmentStatusBadge status={shipment.status} />
          <span className="text-sm text-gray-500">{MODALITY_LABELS[shipment.modality] ?? shipment.modality}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Editar
          </button>
          {shipment.modality === "air" && shipment.awb_number && (
            <Link
              href={`/api/print/mawb/${shipment.id}`}
              target="_blank"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Imprimir MAWB
            </Link>
          )}
          {nextStatus && (
            <button
              onClick={() => advance(shipment.id, shipment.modality, shipment.status)}
              disabled={isPending}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? "Actualizando..." : `Avanzar a: ${getShipmentStatusLabel(nextStatus)}`}
            </button>
          )}
        </div>
      </div>

      {/* Common fields */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoField label="Transportista" value={shipment.carriers?.name} />
        <InfoField label="Destino" value={shipment.destinations ? `${shipment.destinations.city} (${shipment.destinations.country_code})` : null} />
        <InfoField label="Agente destino" value={shipment.agencies?.name} />
        <InfoField label="Remitente" value={shipment.shipper_name} />
        <InfoField label="Consignatario" value={shipment.consignee_name} />
        <InfoField label="Piezas" value={shipment.total_pieces} />
        <InfoField label="Peso" value={shipment.total_weight_lb ? `${shipment.total_weight_lb} lb` : null} />
      </div>

      {/* Modality-specific fields */}
      {shipment.modality === "air" && (
        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-medium text-gray-900">Datos Aéreos</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField label="AWB" value={shipment.awb_number} />
            <InfoField label="Booking" value={shipment.booking_number} />
            <InfoField label="Vuelo" value={shipment.flight_number} />
            <InfoField label="Aeropuerto origen" value={shipment.departure_airport} />
            <InfoField label="Aeropuerto destino" value={shipment.arrival_airport} />
            <InfoField label="Fecha salida" value={shipment.departure_date} />
            <InfoField label="Fecha llegada" value={shipment.arrival_date} />
          </div>
        </div>
      )}

      {shipment.modality === "ocean" && (
        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-medium text-gray-900">Datos Marítimos</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField label="BOL" value={shipment.bol_number} />
            <InfoField label="Puerto de carga" value={shipment.port_of_loading} />
            <InfoField label="Buque" value={shipment.vessel_name} />
            <InfoField label="Viaje" value={shipment.voyage_id} />
            <InfoField label="Puerto de descarga" value={shipment.port_of_unloading} />
            <InfoField label="Flete" value={shipment.freight_terms === "prepaid" ? "Prepagado" : shipment.freight_terms === "collect" ? "Por Cobrar" : null} />
          </div>
        </div>
      )}

      {shipment.modality === "ground" && (
        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-medium text-gray-900">Datos Terrestres</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField label="Ruta" value={shipment.route_number} />
            <InfoField label="Terminal origen" value={shipment.origin_terminal} />
            <InfoField label="Terminal destino" value={shipment.destination_terminal} />
            <InfoField label="Placa" value={shipment.truck_plate} />
            <InfoField label="Conductor" value={shipment.driver_name} />
            <InfoField label="Teléfono conductor" value={shipment.driver_phone} />
          </div>
        </div>
      )}

      {shipment.notes && (
        <div className="border-t pt-4">
          <InfoField label="Notas" value={shipment.notes} />
        </div>
      )}

      {/* House bills */}
      <div className="border-t pt-4">
        <h3 className="mb-3 text-sm font-medium text-gray-900">House Bills asignados</h3>
        {shipment.hawbs.length === 0 ? (
          <p className="text-sm text-gray-500">No hay house bills asignados.</p>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">SI</th>
                  <th className="px-4 py-2">Agencia</th>
                  <th className="px-4 py-2">Pzas</th>
                  <th className="px-4 py-2">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shipment.hawbs.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-2 font-mono text-xs">{h.hawb_number}</td>
                    <td className="px-4 py-2 text-xs uppercase">{h.document_type}</td>
                    <td className="px-4 py-2 text-xs">{h.shipping_instructions?.si_number ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{h.shipping_instructions?.agencies?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{h.pieces ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{h.weight_lb ? `${h.weight_lb} lb` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment panel */}
      <div className="border-t pt-4">
        <HouseBillAssignmentPanel shipmentId={shipment.id} modality={shipment.modality} />
      </div>

      {/* Containers (ocean only) */}
      {shipment.modality === "ocean" && (
        <div className="border-t pt-4">
          <ContainerPanel shipmentId={shipment.id} containers={shipment.shipment_containers ?? []} />
        </div>
      )}

      {/* Edit modal */}
      <ShipmentEditModal open={editOpen} onClose={() => setEditOpen(false)} shipment={shipment} />
    </div>
  );
}
