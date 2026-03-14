"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AgencyModal } from "@/components/agencies/agency-modal";
import { useUserRoles } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { DetailActions } from "@/components/ui/detail-actions";
import type { DetailAction } from "@/components/ui/detail-actions";
import { deleteAgency } from "@/lib/actions/agencies";

interface Agency {
  id: string;
  name: string;
  code: string;
  type: string;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  allow_multi_package: boolean;
}

export function AgencyDetailActions({ agency }: { agency: Agency }) {
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
      roles: ["super_admin", "forwarder_admin", "destination_admin", "agency"],
    },
    {
      label: "Eliminar",
      variant: "danger",
      roles: ["super_admin", "forwarder_admin", "destination_admin"],
      onClick: () => {
        if (!confirm("¿Eliminar permanentemente esta agencia?\n\nSe eliminarán también los roles de usuario asociados.\n\nEsta acción no se puede deshacer.")) return;
        startTransition(async () => {
          const result = await deleteAgency(agency.id);
          if (result?.error) {
            notify(result.error, "error");
          } else {
            notify("Agencia eliminada", "success");
            router.push(`/${locale}/agencies`);
          }
        });
      },
    },
  ];

  return (
    <>
      <DetailActions actions={actions} userRoles={roles} />
      <AgencyModal
        key={agency.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        agency={agency}
      />
    </>
  );
}
