"use client";

import { useCallback, useEffect, useState } from "react";

import { CreateShipmentModal } from "@/components/shipments/create-shipment-modal";
import type { SelectedSI } from "@/lib/shipping-utils";
import { getShipmentModality } from "@/lib/shipping-utils";

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

interface SiActionBarProps {
  selectedSIs: SelectedSI[];
  onClearSelection: () => void;
  warehouses: Warehouse[];
  destinations: Destination[];
  carriers: Carrier[];
  agencies: Agency[];
  orgName?: string;
}

export function SiActionBar({
  selectedSIs,
  onClearSelection,
  warehouses,
  destinations,
  carriers,
  agencies,
  orgName,
}: SiActionBarProps) {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const count = selectedSIs.length;

  useEffect(() => {
    if (count > 0) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [count]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleSuccess = useCallback(() => {
    setShowModal(false);
    onClearSelection();
  }, [onClearSelection]);

  if (count === 0) return null;

  // Check if all selected SIs have the same shipment modality
  const modalities = new Set(selectedSIs.map((si) => getShipmentModality(si.modality_code)));
  const isMixed = modalities.size > 1;

  return (
    <div className="contents">
      {/* Mixed type warning */}
      {isMixed && (
        <div className="fixed bottom-[68px] left-60 right-0 z-40 flex justify-center px-6">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
            Las SIs seleccionadas tienen modalidades mixtas. Seleccione solo una modalidad para crear un embarque.
          </div>
        </div>
      )}

      {/* Floating action bar */}
      <div
        className={`fixed bottom-0 left-60 right-0 z-40 transition-transform duration-300 ease-out ${
          mounted && !showModal ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="border-t bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 px-6 py-3.5">
            {/* Left: Selection count */}
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900">{count}</span>
              <span className="text-sm text-gray-500">SI{count !== 1 && "s"} seleccionada{count !== 1 && "s"}</span>
              <button
                type="button"
                onClick={onClearSelection}
                className="ml-1 text-xs text-gray-400 hover:text-gray-600"
                title="Deseleccionar todo"
              >
                ✕
              </button>
            </div>

            <div className="mx-2 h-6 w-px shrink-0 bg-gray-200" />

            {/* Center: Create shipment button */}
            <button
              type="button"
              onClick={() => setShowModal(true)}
              disabled={isMixed}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                isMixed
                  ? "cursor-not-allowed border-gray-200 text-gray-400 opacity-50"
                  : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              Crear Embarque
            </button>
          </div>
        </div>
      </div>

      {/* Create shipment modal */}
      {showModal && !isMixed && (
        <CreateShipmentModal
          open={showModal}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          selectedSIs={selectedSIs}
          warehouses={warehouses}
          destinations={destinations}
          carriers={carriers}
          agencies={agencies}
          orgName={orgName}
        />
      )}
    </div>
  );
}
