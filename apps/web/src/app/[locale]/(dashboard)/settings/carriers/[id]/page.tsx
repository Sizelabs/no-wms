import Link from "next/link";
import { notFound } from "next/navigation";

import { AwbBatchPanel } from "@/components/carriers/awb-batch-panel";
import { PageHeader } from "@/components/layout/page-header";
import { getCarrier } from "@/lib/actions/carriers";
import { requirePermission } from "@/lib/auth/require-permission";

const MODALITY_LABELS: Record<string, string> = {
  air: "Aéreo",
  ocean: "Marítimo",
  ground: "Terrestre",
};

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

  return (
    <div className="space-y-6">
      <PageHeader title={carrier.name}>
        {canEdit && (
          <Link
            href={`/${locale}/settings/carriers/${id}/edit`}
            className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Editar
          </Link>
        )}
      </PageHeader>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs text-gray-500">Código</p>
          <p className="font-mono text-sm">{carrier.code}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Modalidad</p>
          <p className="text-sm">{MODALITY_LABELS[carrier.modality] ?? carrier.modality}</p>
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

      {/* AWB batch panel for air carriers only */}
      {carrier.modality === "air" && (
        <div className="border-t pt-6">
          <AwbBatchPanel carrierId={id} batches={carrier.awb_batches ?? []} />
        </div>
      )}
    </div>
  );
}
