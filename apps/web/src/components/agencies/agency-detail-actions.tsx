"use client";

import { useParams, useRouter } from "next/navigation";
import { useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { deleteAgency } from "@/lib/actions/agencies";

export function AgencyDetailActions({ agencyId }: { agencyId: string }) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const roles = useUserRoles();

  const actions: DetailAction[] = [
    {
      label: "Editar",
      href: `/${locale}/agencies/${agencyId}/edit`,
      roles: ["super_admin", "forwarder_admin", "destination_admin", "agency"],
    },
    {
      label: "Eliminar",
      variant: "danger",
      roles: ["super_admin", "forwarder_admin", "destination_admin"],
      onClick: () => {
        if (!confirm("¿Eliminar permanentemente esta agencia?\n\nSe eliminarán también los roles de usuario asociados.\n\nEsta acción no se puede deshacer.")) return;
        startTransition(async () => {
          const result = await deleteAgency(agencyId);
          if (result?.error) {
            notify(result.error, "error");
          } else {
            router.push(`/${locale}/agencies`);
          }
        });
      },
    },
  ];

  return <DetailActions actions={actions} userRoles={roles} />;
}
