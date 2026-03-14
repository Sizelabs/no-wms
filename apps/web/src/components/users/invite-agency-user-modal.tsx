"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { inviteUser } from "@/lib/actions/users";

interface InviteAgencyUserModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  agencyId: string;
}

export function InviteAgencyUserModal({ open, onClose, organizationId, agencyId }: InviteAgencyUserModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = fd.get("full_name") as string;
    const email = fd.get("email") as string;

    startTransition(async () => {
      const result = await inviteUser(organizationId, fullName, email, "agency", {
        agency_id: agencyId,
      });
      if (result?.error) {
        notify(result.error, "error");
      } else {
        notify("Invitación enviada", "success");
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>Invitar Usuario</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">Usuario</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Nombre completo<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input name="full_name" type="text" required className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Correo electrónico<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input name="email" type="email" required className={inputClass} />
                  <p className="mt-1 text-xs text-gray-400">Se le enviará una invitación para configurar su contraseña.</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">El usuario será asignado con el rol <strong>Agencia Subcourier</strong>.</p>
            </fieldset>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isPending} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {isPending ? "Enviando..." : "Enviar Invitación"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
