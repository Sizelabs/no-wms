"use client";

import { useParams, useRouter } from "next/navigation";
import { useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { deleteWarehouse } from "@/lib/actions/warehouses";

export function WarehouseDetailActions({
  warehouseId,
}: {
  warehouseId: string;
}) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const roles = useUserRoles();

  const actions: DetailAction[] = [
    {
      label: "Editar",
      href: `/${locale}/settings/warehouses/${warehouseId}/edit`,
      roles: ["forwarder_admin", "warehouse_admin"],
    },
    {
      label: "Eliminar",
      variant: "danger",
      roles: ["super_admin", "forwarder_admin"],
      onClick: () => {
        if (!confirm("¿Eliminar permanentemente esta bodega?\n\nSe eliminarán también los roles de usuario y datos de cobertura asociados.\n\nEsta acción no se puede deshacer.")) return;
        startTransition(async () => {
          const result = await deleteWarehouse(warehouseId);
          if (result?.error) {
            notify(result.error, "error");
          } else {
            router.push(`/${locale}/settings/warehouses`);
          }
        });
      },
    },
  ];

  return <DetailActions actions={actions} userRoles={roles} />;
}
