"use client";

import { useParams, useRouter } from "next/navigation";
import { useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import {
  resendInvite,
  resetUserPassword,
  toggleUserActive,
} from "@/lib/actions/users";

export function UserDetailActions({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const roles = useUserRoles();

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
      href: `/${locale}/users/${userId}/edit`,
      roles: ["forwarder_admin"],
    },
    {
      label: "Reenviar invitación",
      roles: ["forwarder_admin"],
      onClick: () =>
        handleAction(
          () => resendInvite(userId),
          "Invitación reenviada",
        ),
    },
    {
      label: "Reset contraseña",
      roles: ["forwarder_admin"],
      onClick: () =>
        handleAction(
          () => resetUserPassword(userId),
          "Email de recuperación enviado",
        ),
    },
    {
      label: isActive ? "Desactivar" : "Activar",
      variant: isActive ? "danger" : "default",
      roles: ["forwarder_admin"],
      onClick: () =>
        handleAction(
          () => toggleUserActive(userId, !isActive),
          isActive ? "Usuario desactivado" : "Usuario activado",
        ),
    },
  ];

  return <DetailActions actions={actions} userRoles={roles} />;
}
