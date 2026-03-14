"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { createOrganization, updateOrganization } from "@/lib/actions/organizations";

interface Forwarder {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ForwarderModalProps {
  open: boolean;
  onClose: () => void;
  forwarder?: Forwarder | null;
}

export function ForwarderModal({ open, onClose, forwarder }: ForwarderModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!forwarder;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateOrganization(forwarder.id, formData);
          notify("Freight forwarder actualizado", "success");
        } else {
          await createOrganization(formData);
          notify("Freight forwarder creado", "success");
        }
        router.refresh();
        onClose();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al guardar freight forwarder",
          "error",
        );
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          {isEditing ? "Editar Freight Forwarder" : "Nuevo Freight Forwarder"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Freight Forwarder
              </legend>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Nombre<span className="ml-0.5 text-red-400">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={forwarder?.name ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">URL del Logo</label>
                <input
                  name="logo_url"
                  type="url"
                  defaultValue={forwarder?.logo_url ?? ""}
                  className={inputClass}
                />
              </div>
            </fieldset>

            {!isEditing && (
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Administrador
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Nombre completo<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      name="admin_name"
                      type="text"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-gray-600">
                      Correo electrónico<span className="ml-0.5 text-red-400">*</span>
                    </label>
                    <input
                      name="admin_email"
                      type="email"
                      required
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Se le enviará una invitación para configurar su contraseña.
                    </p>
                  </div>
                </div>
              </fieldset>
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
            type="submit"
            disabled={isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : isEditing ? "Guardar" : "Crear Freight Forwarder"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
