"use client";

import { CONTAINER_TYPE_LABELS } from "@no-wms/shared/constants/shipments";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { inputClass } from "@/components/ui/form-section";
import { addContainer, removeContainer } from "@/lib/actions/shipments";

interface Container {
  id: string;
  container_number: string;
  seal_number: string | null;
  container_type: string;
  tare_weight: number | null;
  max_payload: number | null;
}

interface ContainerPanelProps {
  shipmentId: string;
  containers: Container[];
}

export function ContainerPanel({ shipmentId, containers }: ContainerPanelProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [containerNumber, setContainerNumber] = useState("");
  const [sealNumber, setSealNumber] = useState("");
  const [containerType, setContainerType] = useState("40ft");

  const handleAdd = () => {
    if (!containerNumber) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("shipment_id", shipmentId);
      fd.set("container_number", containerNumber);
      fd.set("container_type", containerType);
      if (sealNumber) fd.set("seal_number", sealNumber);

      const res = await addContainer(fd);
      if ("error" in res) {
        notify(res.error, "error");
      } else {
        notify("Contenedor agregado", "success");
        setShowForm(false);
        setContainerNumber("");
        setSealNumber("");
      }
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const res = await removeContainer(id);
      if (res.error) {
        notify(res.error, "error");
      } else {
        notify("Contenedor eliminado", "success");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Contenedores</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
        >
          + Contenedor
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Número *</label>
              <input type="text" value={containerNumber} onChange={(e) => setContainerNumber(e.target.value)} placeholder="MSCU1234567" className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Sello</label>
              <input type="text" value={sealNumber} onChange={(e) => setSealNumber(e.target.value)} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Tipo</label>
              <select value={containerType} onChange={(e) => setContainerType(e.target.value)} className={`mt-1 ${inputClass}`}>
                {Object.entries(CONTAINER_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100">
              Cancelar
            </button>
            <button onClick={handleAdd} disabled={isPending || !containerNumber} className="rounded bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-800 disabled:opacity-50">
              {isPending ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {containers.length === 0 ? (
        <p className="text-sm text-gray-500">No hay contenedores.</p>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2">Número</th>
                <th className="px-4 py-2">Sello</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {containers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-mono text-xs">{c.container_number}</td>
                  <td className="px-4 py-2 text-xs">{c.seal_number ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{CONTAINER_TYPE_LABELS[c.container_type as keyof typeof CONTAINER_TYPE_LABELS] ?? c.container_type}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleRemove(c.id)} disabled={isPending} className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
