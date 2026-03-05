"use client";

import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FormActions,
  FormCard,
  FormSection,
  inputClass,
  primaryBtnClass,
  secondaryBtnClass,
  selectClass,
} from "@/components/ui/form-section";
import { inviteUser } from "@/lib/actions/users";

const ASSIGNABLE_ROLES = [
  "forwarder_admin",
  "warehouse_admin",
  "warehouse_operator",
  "shipping_clerk",
  "destination_admin",
  "destination_operator",
  "agency",
] as const;

const WAREHOUSE_ROLES = ["warehouse_admin", "warehouse_operator", "shipping_clerk"];
const COURIER_ROLES = ["destination_admin", "destination_operator"];
const AGENCY_ROLES = ["agency"];

interface InviteUserFormProps {
  organizationId: string;
  warehouses?: { id: string; name: string; code: string }[];
  couriers?: { id: string; name: string; code: string }[];
  agencies?: { id: string; name: string; code: string }[];
}

export function InviteUserForm({ organizationId, warehouses = [], couriers = [], agencies = [] }: InviteUserFormProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<string>(ASSIGNABLE_ROLES[0]);

  const showWarehouse = WAREHOUSE_ROLES.includes(selectedRole);
  const showCourier = COURIER_ROLES.includes(selectedRole);
  const showAgency = AGENCY_ROLES.includes(selectedRole);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = fd.get("full_name") as string;
    const email = fd.get("email") as string;
    const role = fd.get("role") as string;
    const warehouseId = fd.get("warehouse_id") as string | null;
    const courierId = fd.get("courier_id") as string | null;
    const agencyId = fd.get("agency_id") as string | null;

    startTransition(async () => {
      const result = await inviteUser(organizationId, fullName, email, role, {
        warehouse_id: warehouseId || undefined,
        courier_id: courierId || undefined,
        agency_id: agencyId || undefined,
      });
      if (result?.error) {
        notify(result.error, "error");
      } else {
        router.back();
      }
    });
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit}>
        <FormSection title="Usuario" icon={UserPlus}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre completo" htmlFor="full_name" required>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className={inputClass}
              />
            </Field>
            <Field
              label="Correo electrónico"
              htmlFor="email"
              required
              hint="Se le enviará una invitación para configurar su contraseña."
            >
              <input
                id="email"
                name="email"
                type="email"
                required
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Rol" htmlFor="role" required>
            <select
              id="role"
              name="role"
              required
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={selectClass}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>

          {showWarehouse && (
            <Field label="Almacén asignado" htmlFor="warehouse_id" required>
              <Combobox
                id="warehouse_id"
                name="warehouse_id"
                options={warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                placeholder="Seleccionar almacén..."
                required
              />
            </Field>
          )}

          {showCourier && (
            <Field label="Courier asignado" htmlFor="courier_id" required>
              <Combobox
                id="courier_id"
                name="courier_id"
                options={couriers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                placeholder="Seleccionar courier..."
                required
              />
            </Field>
          )}

          {showAgency && (
            <Field label="Agencia asignada" htmlFor="agency_id" required>
              <Combobox
                id="agency_id"
                name="agency_id"
                options={agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
                placeholder="Seleccionar agencia..."
                required
              />
            </Field>
          )}
        </FormSection>
        <FormActions>
          <button
            type="button"
            onClick={() => router.back()}
            className={secondaryBtnClass}
          >
            {t("cancel")}
          </button>
          <button type="submit" disabled={isPending} className={primaryBtnClass}>
            {isPending ? t("loading") : "Enviar Invitación"}
          </button>
        </FormActions>
      </form>
    </FormCard>
  );
}
