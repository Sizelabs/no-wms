"use client";

import { useParams, useRouter } from "next/navigation";
import { useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { deleteConsignee } from "@/lib/actions/consignees";

export function ConsigneeDetailActions({ consigneeId }: { consigneeId: string }) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const roles = useUserRoles();

  const actions: DetailAction[] = [
    {
      label: "Editar",
      href: `/${locale}/consignees/${consigneeId}/edit`,
      roles: ["forwarder_admin", "destination_admin", "agency"],
    },
    {
      label: "Desactivar",
      variant: "danger",
      roles: ["forwarder_admin", "destination_admin", "agency"],
      onClick: () => {
        if (!confirm("¿Desactivar este consignatario?")) return;
        startTransition(async () => {
          const result = await deleteConsignee(consigneeId);
          if (result?.error) {
            notify(result.error, "error");
          } else {
            notify("Consignatario desactivado", "success");
            router.push(`/${locale}/consignees`);
          }
        });
      },
    },
  ];

  return <DetailActions actions={actions} userRoles={roles} />;
}
