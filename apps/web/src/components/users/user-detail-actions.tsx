"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { UserEditModal } from "@/components/users/user-edit-modal";
import {
  resendInvite,
  resetUserPassword,
  toggleUserActive,
} from "@/lib/actions/users";

interface UserData {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
}

export function UserDetailActions({ user }: { user: UserData }) {
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const roles = useUserRoles();
  const [editOpen, setEditOpen] = useState(false);

  function handleAction(
    action: () => Promise<{ error: string } | null>,
    successMessage: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        notify(result.error, "error");
      } else {
        notify(successMessage, "success");
        router.refresh();
      }
    });
  }

  const actions: DetailAction[] = [
    {
      label: "Editar perfil",
      onClick: () => setEditOpen(true),
      roles: ["super_admin", "forwarder_admin"],
    },
    {
      label: "Reenviar invitación",
      roles: ["super_admin", "forwarder_admin"],
      onClick: () =>
        handleAction(
          () => resendInvite(user.id),
          "Invitación reenviada",
        ),
    },
    {
      label: "Reset contraseña",
      roles: ["super_admin", "forwarder_admin"],
      onClick: () =>
        handleAction(
          () => resetUserPassword(user.id),
          "Email de recuperación enviado",
        ),
    },
    {
      label: user.is_active ? "Desactivar" : "Activar",
      variant: user.is_active ? "danger" : "default",
      roles: ["super_admin", "forwarder_admin"],
      onClick: () =>
        handleAction(
          () => toggleUserActive(user.id, !user.is_active),
          user.is_active ? "Usuario desactivado" : "Usuario activado",
        ),
    },
  ];

  return (
    <>
      <DetailActions actions={actions} userRoles={roles} />
      <UserEditModal
        key={user.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={user}
      />
    </>
  );
}
