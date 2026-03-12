"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass } from "@/components/ui/form-section";
import { createCarrier, updateCarrier } from "@/lib/actions/carriers";

interface CarrierFormProps {
  carrier?: {
    id: string;
    code: string;
    name: string;
    modality: string;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    is_active: boolean;
  };
}

export function CarrierForm({ carrier }: CarrierFormProps) {
  const { notify } = useNotification();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState(carrier?.code ?? "");
  const [name, setName] = useState(carrier?.name ?? "");
  const [modality, setModality] = useState(carrier?.modality ?? "air");
  const [contactName, setContactName] = useState(carrier?.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(carrier?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(carrier?.contact_email ?? "");
  const [isActive, setIsActive] = useState(carrier?.is_active ?? true);

  const isEdit = !!carrier;

  const handleSubmit = () => {
    if (!name || !code) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("code", code);
      fd.set("modality", modality);
      fd.set("contact_name", contactName);
      fd.set("contact_phone", contactPhone);
      fd.set("contact_email", contactEmail);
      if (isEdit) fd.set("is_active", String(isActive));

      const res = isEdit
        ? await updateCarrier(carrier.id, fd)
        : await createCarrier(fd);

      if ("error" in res && res.error) {
        notify(res.error, "error");
      } else {
        notify(isEdit ? "Transportista actualizado" : "Transportista creado", "success");
        if (!isEdit) router.back();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Código *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="906, MSC, DHL..."
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Copa Airlines, MSC..."
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Modalidad *</label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            disabled={isEdit}
            className={`mt-1 ${inputClass}`}
          >
            <option value="air">Aéreo</option>
            <option value="ocean">Marítimo</option>
            <option value="ground">Terrestre</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contacto</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Nombre del contacto"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+593 ..."
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contacto@airline.com"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        {isEdit && (
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label className="text-sm text-gray-700">Activo</label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => router.back()}
          className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending || !name || !code}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : isEdit ? "Guardar" : "Crear Transportista"}
        </button>
      </div>
    </div>
  );
}
