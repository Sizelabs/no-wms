"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { Combobox } from "@/components/ui/combobox";
import { inputClass } from "@/components/ui/form-section";
import { generateInvoice } from "@/lib/actions/invoices";
import { formatDate } from "@/lib/format";

interface Agency {
  id: string;
  name: string;
  code: string;
}

interface InvoiceGenerateFormProps {
  agencies: Agency[];
}

export function InvoiceGenerateForm({ agencies }: InvoiceGenerateFormProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [formValues, setFormValues] = useState({
    agency_id: "",
    period_start: "",
    period_end: "",
  });

  const selectedAgency = agencies.find((a) => a.id === formValues.agency_id);

  const handleConfirm = () => {
    const formData = new FormData();
    formData.set("agency_id", formValues.agency_id);
    formData.set("period_start", formValues.period_start);
    formData.set("period_end", formValues.period_end);

    startTransition(async () => {
      const result = await generateInvoice(formData);
      if ("error" in result) {
        notify(result.error, "error");
      } else {
        notify("Factura generada exitosamente", "success");
        router.push(`/invoicing/${result.id}`);
      }
    });
  };

  if (step === "confirm") {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Confirmar generación de factura</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Agencia</dt>
            <dd className="font-medium">{selectedAgency?.name} ({selectedAgency?.code})</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Periodo</dt>
            <dd className="font-medium">
              {formatDate(formValues.period_start)} —{" "}
              {formatDate(formValues.period_end)}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-gray-500">
          Se calcularán automáticamente los cargos de envío (según tarifas), almacenaje,
          órdenes de trabajo y recargos para el periodo seleccionado.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Generando..." : "Generar Factura"}
          </button>
          <button
            onClick={() => setStep("select")}
            disabled={isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-lg border bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Generar Factura</h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Agencia</label>
        <Combobox
          options={agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
          value={formValues.agency_id}
          onChange={(v) => setFormValues((f) => ({ ...f, agency_id: v }))}
          placeholder="Seleccionar agencia"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Inicio del periodo</label>
          <input
            type="date"
            value={formValues.period_start}
            onChange={(e) => setFormValues((f) => ({ ...f, period_start: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Fin del periodo</label>
          <input
            type="date"
            value={formValues.period_end}
            onChange={(e) => setFormValues((f) => ({ ...f, period_end: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => {
            if (!formValues.agency_id || !formValues.period_start || !formValues.period_end) {
              notify("Complete todos los campos", "error");
              return;
            }
            setStep("confirm");
          }}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Siguiente
        </button>
        <button
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
