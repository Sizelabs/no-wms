"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { createCarrier, updateCarrier } from "@/lib/actions/carriers";

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

interface CarrierModalProps {
  open: boolean;
  onClose: () => void;
  carrier?: Carrier | null;
  modalities: Modality[];
}

export function CarrierModal({ open, onClose, carrier, modalities }: CarrierModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState(carrier?.code ?? "");
  const [name, setName] = useState(carrier?.name ?? "");
  const [selectedModalityIds, setSelectedModalityIds] = useState<string[]>(
    carrier?.modalities.map((m) => m.id) ?? [],
  );
  const [contactName, setContactName] = useState(carrier?.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(carrier?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(carrier?.contact_email ?? "");
  const [isActive, setIsActive] = useState(carrier?.is_active ?? true);

  const isEditing = !!carrier;

  const toggleModality = (id: string) => {
    setSelectedModalityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = () => {
    if (!name || !code || selectedModalityIds.length === 0) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("code", code);
      for (const mid of selectedModalityIds) {
        fd.append("modality_ids", mid);
      }
      fd.set("contact_name", contactName);
      fd.set("contact_phone", contactPhone);
      fd.set("contact_email", contactEmail);
      if (isEditing) fd.set("is_active", String(isActive));

      const res = isEditing
        ? await updateCarrier(carrier.id, fd)
        : await createCarrier(fd);

      if ("error" in res && res.error) {
        notify(res.error, "error");
      } else {
        notify(isEditing ? "Transportista actualizado" : "Transportista creado", "success");
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        {isEditing ? "Editar Transportista" : "Nuevo Transportista"}
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Información General
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Código<span className="ml-0.5 text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="906, MSC, DHL..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Nombre<span className="ml-0.5 text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Copa Airlines, MSC..."
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-600">
                Modalidades<span className="ml-0.5 text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {modalities.map((m) => {
                  const selected = selectedModalityIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModality(m.id)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                        selected
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
              {selectedModalityIds.length === 0 && (
                <p className="mt-1 text-xs text-red-500">Seleccione al menos una modalidad</p>
              )}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Contacto
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">Nombre</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nombre del contacto"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">Teléfono</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+593 ..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contacto@airline.com"
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          {isEditing && (
            <div className="flex items-center gap-2">
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
          disabled={isPending || !name || !code || selectedModalityIds.length === 0}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : isEditing ? "Guardar" : "Crear Transportista"}
        </button>
      </ModalFooter>
    </Modal>
  );
}
