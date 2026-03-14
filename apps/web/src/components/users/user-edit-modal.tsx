"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { updateUserProfile } from "@/lib/actions/users";

interface UserData {
  id: string;
  full_name: string;
  phone: string | null;
}

interface UserEditModalProps {
  open: boolean;
  onClose: () => void;
  user?: UserData | null;
}

export function UserEditModal({ open, onClose, user }: UserEditModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateUserProfile(user!.id, formData);
        notify("Usuario actualizado", "success");
        router.refresh();
        onClose();
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Error al actualizar usuario",
          "error",
        );
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>Editar Usuario</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">Usuario</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Nombre completo<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input name="full_name" type="text" required defaultValue={user.full_name} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Teléfono</label>
                  <input name="phone" type="tel" defaultValue={user.phone ?? ""} className={inputClass} />
                </div>
              </div>
            </fieldset>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isPending} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
