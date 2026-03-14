/** House bill with nested shipping instruction — returned by getShipment(). */
export interface ShipmentDetailHouseBill {
  id: string;
  hawb_number: string;
  document_type: string;
  pieces: number | null;
  weight_lb: number | null;
  shipping_instructions: {
    si_number: string;
    agency_id: string;
    agencies: { name: string; code: string } | null;
  } | null;
}

/** Shipment container — returned by getShipment(). */
export interface ShipmentContainer {
  id: string;
  container_number: string;
  seal_number: string | null;
  container_type: string;
  tare_weight: number | null;
  max_payload: number | null;
}

/** Full shipment detail — returned by getShipment(). */
export interface ShipmentDetail {
  id: string;
  shipment_number: string;
  modality: string;
  status: string;
  carriers: { name: string; code: string } | null;
  destinations: { city: string; country_code: string } | null;
  agencies: { name: string; code: string } | null;
  shipper_name: string | null;
  consignee_name: string | null;
  total_pieces: number | null;
  total_weight_lb: number | null;
  notes: string | null;
  // Air
  awb_number: string | null;
  booking_number: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  // Ocean
  bol_number: string | null;
  port_of_loading: string | null;
  vessel_name: string | null;
  voyage_id: string | null;
  port_of_unloading: string | null;
  freight_terms: string | null;
  // Ground
  route_number: string | null;
  origin_terminal: string | null;
  destination_terminal: string | null;
  truck_plate: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  // Relations
  hawbs: ShipmentDetailHouseBill[];
  shipment_containers: ShipmentContainer[];
}
