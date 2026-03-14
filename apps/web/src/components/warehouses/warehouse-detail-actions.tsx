"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { WarehouseModal } from "@/components/warehouses/warehouse-modal";
import { deleteWarehouse } from "@/lib/actions/warehouses";

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  timezone: string;
  is_active: boolean;
}

export function WarehouseDetailActions({
  warehouse,
}: {
  warehouse: WarehouseData;
}) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const { notify } = useNotification();
  const [, startTransition] = useTransition();
  const roles = useUserRoles();
  const [editOpen, setEditOpen] = useState(false);

  const actions: DetailAction[] = [
    {
      label: "Editar",
      onClick: () => setEditOpen(true),
      roles: ["forwarder_admin", "warehouse_admin"],
    },
    {
      label: "Eliminar",
      variant: "danger",
      roles: ["super_admin", "forwarder_admin"],
      onClick: () => {
        if (!confirm("¿Eliminar permanentemente esta bodega?\n\nSe eliminarán también los roles de usuario y datos de cobertura asociados.\n\nEsta acción no se puede deshacer.")) return;
        startTransition(async () => {
          const result = await deleteWarehouse(warehouse.id);
          if (result?.error) {
            notify(result.error, "error");
          } else {
            notify("Bodega eliminada", "success");
            router.push(`/${locale}/settings/warehouses`);
          }
        });
      },
    },
  ];

  return (
    <>
      <DetailActions actions={actions} userRoles={roles} />
      <WarehouseModal
        key={warehouse.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        warehouse={warehouse}
      />
    </>
  );
}
