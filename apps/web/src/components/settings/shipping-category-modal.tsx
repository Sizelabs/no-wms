"use client";

import { CARGO_TYPES, CUSTOMS_DECLARATION_TYPES, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "@no-wms/shared/constants/shipping-categories";
import type { DocumentType } from "@no-wms/shared/constants/shipping-categories";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { inputClass, selectClass } from "@/components/ui/form-section";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { getDestinationCountries } from "@/lib/actions/destinations";
import { createShippingCategory, updateShippingCategory } from "@/lib/actions/shipping-categories";
import { getModalities } from "@/lib/actions/tariffs";

interface RequiredDocEntry {
  document_type: string;
  label: string;
  description: string;
  is_required: boolean;
}

interface ModalityOption {
  id: string;
  name: string;
  code: string;
}

interface ShippingCategoryItem {
  id: string;
  code: string;
  name: string;
  country_code: string;
  modality_id: string;
  description: string | null;
  display_order: number;
  max_weight_kg: number | null;
  min_declared_value_usd: number | null;
  max_declared_value_usd: number | null;
  cargo_type: string;
  allows_dgr: boolean;
  requires_cedula: boolean;
  requires_ruc: boolean;
  customs_declaration_type: string;
  country_specific_rules: Record<string, unknown>;
  is_active: boolean;
  shipping_category_required_documents: Array<{
    id: string;
    document_type: string;
    label: string;
    description: string | null;
    is_required: boolean;
  }>;
}

interface ShippingCategoryModalProps {
  open: boolean;
  onClose: () => void;
  item?: ShippingCategoryItem | null;
}

export function ShippingCategoryModal({ open, onClose, item }: ShippingCategoryModalProps) {
  const router = useRouter();
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!item;

  const [modalities, setModalities] = useState<ModalityOption[]>([]);
  const [destinationCountries, setDestinationCountries] = useState<{ isoCode: string; name: string; flag: string }[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocEntry[]>(
    item?.shipping_category_required_documents?.map((d) => ({
      document_type: d.document_type,
      label: d.label,
      description: d.description ?? "",
      is_required: d.is_required,
    })) ?? [],
  );

  // Lazy-load modalities and destination countries when modal opens
  useEffect(() => {
    if (!open) return;
    getModalities().then((res) => {
      if (res.data) {
        setModalities(res.data.map((m: { id: string; name: string; code: string }) => ({
          id: m.id,
          name: m.name,
          code: m.code,
        })));
      }
    });
    getDestinationCountries().then(setDestinationCountries);
  }, [open]);

  const addDoc = () => {
    setRequiredDocs((prev) => [...prev, { document_type: "", label: "", description: "", is_required: true }]);
  };

  const removeDoc = (idx: number) => {
    setRequiredDocs((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateDoc = (idx: number, field: keyof RequiredDocEntry, value: string | boolean) => {
    setRequiredDocs((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const consumesCupo = formData.get("consumes_cupo_4x4") === "true";
    const countryRules: Record<string, unknown> = {};
    if (consumesCupo) countryRules.consumes_cupo_4x4 = true;
    formData.set("country_specific_rules", JSON.stringify(countryRules));
    formData.set("required_documents", JSON.stringify(requiredDocs));

    startTransition(async () => {
      if (isEditing) {
        const result = await updateShippingCategory(item.id, formData);
        if (result.error) {
          notify(result.error, "error");
        } else {
          notify("Categoría actualizada", "success");
          router.refresh();
          onClose();
        }
      } else {
        const result = await createShippingCategory(formData);
        if ("error" in result) {
          notify(result.error, "error");
        } else {
          notify("Categoría creada", "success");
          router.refresh();
          onClose();
        }
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={onClose}>
          {isEditing ? "Editar Categoría de Envío" : "Nueva Categoría de Envío"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Información General
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    País<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <CountryCombobox
                    name="country_code"
                    defaultValue={item?.country_code ?? "EC"}
                    required
                    countries={destinationCountries}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Modalidad<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <select
                    key={modalities.length}
                    name="modality_id"
                    defaultValue={item?.modality_id ?? ""}
                    required
                    className={selectClass}
                  >
                    <option value="">Seleccionar modalidad...</option>
                    {modalities.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Código<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    name="code"
                    type="text"
                    defaultValue={item?.code ?? ""}
                    required
                    className={inputClass}
                    placeholder="B+"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm text-gray-600">
                    Nombre<span className="ml-0.5 text-red-400">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={item?.name ?? ""}
                    required
                    className={inputClass}
                    placeholder="Paquetes 4-50kg o $400-$2000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm text-gray-600">Descripción</label>
                  <input
                    name="description"
                    type="text"
                    defaultValue={item?.description ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Reglas
              </legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Peso máximo (kg)</label>
                  <input
                    name="max_weight_kg"
                    type="number"
                    step="0.01"
                    defaultValue={item?.max_weight_kg ?? ""}
                    className={inputClass}
                    placeholder="Sin límite"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Valor mínimo (USD)</label>
                  <input
                    name="min_declared_value_usd"
                    type="number"
                    step="0.01"
                    defaultValue={item?.min_declared_value_usd ?? ""}
                    className={inputClass}
                    placeholder="Sin mínimo"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Valor máximo (USD)</label>
                  <input
                    name="max_declared_value_usd"
                    type="number"
                    step="0.01"
                    defaultValue={item?.max_declared_value_usd ?? ""}
                    className={inputClass}
                    placeholder="Sin límite"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Tipo de carga</label>
                  <select name="cargo_type" defaultValue={item?.cargo_type ?? "general"} className={selectClass}>
                    <option value={CARGO_TYPES.GENERAL}>General</option>
                    <option value={CARGO_TYPES.DOCUMENTS_ONLY}>Solo Documentos</option>
                    <option value={CARGO_TYPES.DANGEROUS_GOODS}>Mercancía Peligrosa</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600">Declaración aduanera</label>
                  <select name="customs_declaration_type" defaultValue={item?.customs_declaration_type ?? "none"} className={selectClass}>
                    <option value={CUSTOMS_DECLARATION_TYPES.NONE}>Ninguna</option>
                    <option value={CUSTOMS_DECLARATION_TYPES.SIMPLIFIED}>Simplificada</option>
                    <option value={CUSTOMS_DECLARATION_TYPES.FORMAL}>Formal (DAI)</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input name="allows_dgr" type="checkbox" value="true" defaultChecked={item?.allows_dgr ?? false} className="rounded border-gray-300" />
                  Permite DGR
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="requires_cedula" type="checkbox" value="true" defaultChecked={item?.requires_cedula ?? false} className="rounded border-gray-300" />
                  Requiere cédula
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="requires_ruc" type="checkbox" value="true" defaultChecked={item?.requires_ruc ?? false} className="rounded border-gray-300" />
                  Requiere RUC
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="consumes_cupo_4x4" type="checkbox" value="true" defaultChecked={item?.country_specific_rules?.consumes_cupo_4x4 === true} className="rounded border-gray-300" />
                  Consume cupo 4x4
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Documentos Requeridos
              </legend>
              {requiredDocs.map((doc, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-md bg-gray-50 p-3">
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={doc.document_type}
                        onChange={(e) => {
                          updateDoc(idx, "document_type", e.target.value);
                          const label = DOCUMENT_TYPE_LABELS[e.target.value as DocumentType];
                          if (label) updateDoc(idx, "label", label);
                        }}
                        className={selectClass}
                      >
                        <option value="">Tipo de documento...</option>
                        {Object.entries(DOCUMENT_TYPES).map(([key, value]) => (
                          <option key={key} value={value}>
                            {DOCUMENT_TYPE_LABELS[value]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={doc.label}
                        onChange={(e) => updateDoc(idx, "label", e.target.value)}
                        placeholder="Etiqueta"
                        className={inputClass}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={doc.is_required}
                        onChange={(e) => updateDoc(idx, "is_required", e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Obligatorio
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDoc(idx)}
                    className="mt-1 text-xs text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addDoc}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                + Agregar documento
              </button>
            </fieldset>

            {isEditing && (
              <div className="flex items-center gap-2">
                <input
                  name="is_active"
                  type="checkbox"
                  value="true"
                  defaultChecked={item.is_active}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">Activo</label>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Categoría"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
