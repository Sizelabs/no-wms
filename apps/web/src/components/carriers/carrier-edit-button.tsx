"use client";

import { useEffect, useState, useTransition } from "react";

import { CarrierModal } from "@/components/carriers/carrier-modal";
import { getModalities } from "@/lib/actions/tariffs";

interface Modality {
  id: string;
  name: string;
  code: string;
}

interface Carrier {
  id: string;
  code: string;
  name: string;
  modalities: Modality[];
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
}

export function CarrierEditButton({ carrier }: { carrier: Carrier }) {
  const [open, setOpen] = useState(false);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (open && modalities.length === 0) {
      startTransition(async () => {
        const { data } = await getModalities();
        if (data) setModalities(data);
      });
    }
  }, [open, modalities.length]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Editar
      </button>
      <CarrierModal
        key={carrier.id}
        open={open}
        onClose={() => setOpen(false)}
        carrier={carrier}
        modalities={modalities}
      />
    </>
  );
}
