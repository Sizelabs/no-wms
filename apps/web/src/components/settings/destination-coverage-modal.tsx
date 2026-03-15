"use client";

import { useOptimistic, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { upsertCourierDestination } from "@/lib/actions/couriers";

interface ModalityInfo {
  id: string;
  name: string;
  code: string;
}

interface CourierWithDestinations {
  id: string;
  name: string;
  organization_id: string;
  courier_destinations: { destination_id: string; modality_id: string; is_active: boolean }[];
}

interface DestinationCoverageModalProps {
  open: boolean;
  onClose: () => void;
  destinationId: string;
  destinationLabel: string;
  couriers: CourierWithDestinations[];
  modalities: ModalityInfo[];
}

export function DestinationCoverageModal({
  open,
  onClose,
  destinationId,
  destinationLabel,
  couriers,
  modalities,
}: DestinationCoverageModalProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  const [optimisticToggles, setOptimisticToggle] = useOptimistic(
    {} as Record<string, boolean>,
    (state: Record<string, boolean>, update: { key: string; value: boolean }) => ({
      ...state,
      [update.key]: update.value,
    }),
  );

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        Cobertura — {destinationLabel}
      </ModalHeader>
      <ModalBody>
        {couriers.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No hay couriers registrados.</p>
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Courier</th>
                  {modalities.map((m) => (
                    <th key={m.id} className="px-4 py-3 text-center">
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {couriers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    {modalities.map((m) => {
                      const toggleKey = `${c.id}:${destinationId}:${m.id}`;
                      const cd = c.courier_destinations.find(
                        (cd) => cd.destination_id === destinationId && cd.modality_id === m.id,
                      );
                      const serverValue = cd?.is_active ?? false;
                      const isEnabled = toggleKey in optimisticToggles ? optimisticToggles[toggleKey]! : serverValue;
                      return (
                        <td key={m.id} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            disabled={isPending}
                            onChange={() => {
                              startTransition(async () => {
                                setOptimisticToggle({ key: toggleKey, value: !isEnabled });
                                try {
                                  await upsertCourierDestination(
                                    c.id,
                                    destinationId,
                                    m.id,
                                    c.organization_id,
                                    !isEnabled,
                                  );
                                } catch {
                                  notify("Error al actualizar cobertura", "error");
                                }
                              });
                            }}
                            className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}
