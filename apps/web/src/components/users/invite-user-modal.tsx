"use client";

import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { inviteUser } from "@/lib/actions/users";
import { createClient } from "@/lib/supabase/client";

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

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

export function InviteUserModal({ open, onClose, organizationId }: InviteUserModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<string>(ASSIGNABLE_ROLES[0]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [couriers, setCouriers] = useState<{ id: string; name: string; code: string }[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string; code: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
      supabase.from("couriers").select("id, name, code").eq("is_active", true).order("name"),
      supabase.from("agencies").select("id, name, code").eq("is_active", true).order("name"),
    ]).then(([w, c, a]) => {
      setWarehouses(w.data ?? []);
      setCouriers(c.data ?? []);
      setAgencies(a.data ?? []);
    });
  }, [open]);

  const showWarehouse = WAREHOUSE_ROLES.includes(selectedRole);
  const showCourier = COURIER_ROLES.includes(selectedRole);
  const showAgency = AGENCY_ROLES.includes(selectedRole);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = fd.get("full_name") as string;
    const email = fd.get("email") as string;
    const warehouseId = fd.get("warehouse_id") as string | null;
    const courierId = fd.get("courier_id") as string | null;
    const agencyId = fd.get("agency_id") as string | null;

    startTransition(async () => {
      const result = await inviteUser(organizationId, fullName, email, selectedRole, {
        warehouse_id: warehouseId || undefined,
        courier_id: courierId || undefined,
        agency_id: agencyId || undefined,
      });
      if (result?.error) {
        notify(result.error, "error");
      } else {
        notify("Invitación enviada", "success");
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>Invitar Usuario</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">Usuario</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Nombre completo<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input name="full_name" type="text" required className={inputClass} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Correo electrónico<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input name="email" type="email" required className={inputClass} />
                  <p className="mt-1 text-xs text-gray-400">Se le enviará una invitación para configurar su contraseña.</p>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-600">
                  Rol<span className="ml-0.5 text-red-400">*</span>
                </label>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className={selectClass}>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              {showWarehouse && (
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Almacén asignado<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <Combobox
                    name="warehouse_id"
                    options={warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                    placeholder="Seleccionar almacén..."
                    required
                  />
                </div>
              )}
              {showCourier && (
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Courier asignado<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <Combobox
                    name="courier_id"
                    options={couriers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                    placeholder="Seleccionar courier..."
                    required
                  />
                </div>
              )}
              {showAgency && (
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Agencia asignada<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <Combobox
                    name="agency_id"
                    options={agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
                    placeholder="Seleccionar agencia..."
                    required
                  />
                </div>
              )}
            </fieldset>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isPending} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {isPending ? "Enviando..." : "Enviar Invitación"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
