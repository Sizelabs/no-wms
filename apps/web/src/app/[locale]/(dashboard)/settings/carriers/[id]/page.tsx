import { notFound } from "next/navigation";

import { CarrierEditButton } from "@/components/carriers/carrier-edit-button";
import { AwbBatchPanel } from "@/components/carriers/awb-batch-panel";
import { PageHeader } from "@/components/layout/page-header";
import { getCarrier } from "@/lib/actions/carriers";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function CarrierDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { permissions } = await requirePermission(locale, "carriers", "read");

  const { data: carrier } = await getCarrier(id);
  if (!carrier) notFound();

  const canEdit = permissions.carriers.update;
  const hasAirModality = carrier.modalities.some(
    (m: { code: string }) => m.code === "aerea",
  );

  return (
    <div className="space-y-6">
      <PageHeader title={carrier.name}>
        {canEdit && <CarrierEditButton carrier={carrier} />}
      </PageHeader>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs text-gray-500">Código</p>
          <p className="font-mono text-sm">{carrier.code}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Modalidades</p>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {carrier.modalities.map((m: { id: string; name: string }) => (
              <span
                key={m.id}
                className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
              >
                {m.name}
              </span>
            ))}
            {carrier.modalities.length === 0 && (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Estado</p>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${carrier.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {carrier.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
        {carrier.contact_name && (
          <div>
            <p className="text-xs text-gray-500">Contacto</p>
            <p className="text-sm">{carrier.contact_name}</p>
          </div>
        )}
        {carrier.contact_phone && (
          <div>
            <p className="text-xs text-gray-500">Teléfono</p>
            <p className="text-sm">{carrier.contact_phone}</p>
          </div>
        )}
        {carrier.contact_email && (
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm">{carrier.contact_email}</p>
          </div>
        )}
      </div>

      {/* AWB batch panel for air carriers */}
      {hasAirModality && (
        <div className="border-t pt-6">
          <AwbBatchPanel carrierId={id} batches={carrier.awb_batches ?? []} />
        </div>
      )}
    </div>
  );
}
