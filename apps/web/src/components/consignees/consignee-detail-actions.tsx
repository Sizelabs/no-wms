"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { ConsigneeModal } from "@/components/consignees/consignee-modal";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { deleteConsignee } from "@/lib/actions/consignees";

interface Consignee {
  id: string;
  full_name: string;
  casillero: string;
  cedula_ruc: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  is_active: boolean;
  agencies: { id: string; name: string; code: string } | null;
}

export function ConsigneeDetailActions({ consignee }: { consignee: Consignee }) {
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
      roles: ["forwarder_admin", "destination_admin", "agency"],
    },
    {
      label: "Desactivar",
      variant: "danger",
      roles: ["forwarder_admin", "destination_admin", "agency"],
      onClick: () => {
        if (!confirm("¿Desactivar este consignatario?")) return;
        startTransition(async () => {
          const result = await deleteConsignee(consignee.id);
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

  return (
    <>
      <DetailActions actions={actions} userRoles={roles} />
      <ConsigneeModal
        key={consignee.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        consignee={consignee}
      />
    </>
  );
}
