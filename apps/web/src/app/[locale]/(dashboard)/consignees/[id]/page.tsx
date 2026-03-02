import Link from "next/link";
import { notFound } from "next/navigation";

import { ConsigneeDetailActions } from "@/components/consignees/consignee-detail-actions";
import { PageHeader } from "@/components/layout/page-header";
import { DtDd, InfoCard, Section } from "@/components/ui/detail-page";
import { getConsignee } from "@/lib/actions/consignees";

export default async function ConsigneeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { data: consignee, error } = await getConsignee(id);

  if (error || !consignee) {
    notFound();
  }

  const agency = consignee.agencies as { id: string; name: string; code: string } | null;

  return (
    <div className="space-y-6">
      <PageHeader title={consignee.full_name}>
        <Link
          href={`/${locale}/consignees`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Volver a consignatarios
        </Link>
        <ConsigneeDetailActions consigneeId={consignee.id} />
      </PageHeader>

      {/* Key info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Casillero">
          <span className="font-mono text-sm">{consignee.casillero}</span>
        </InfoCard>
        <InfoCard label="Agencia">
          {agency ? (
            <Link
              href={`/${locale}/agencies/${agency.id}`}
              className="text-sm font-medium hover:underline"
            >
              {agency.name}
            </Link>
          ) : (
            "—"
          )}
        </InfoCard>
        <InfoCard label="Cédula/RUC">
          {consignee.cedula_ruc ?? "—"}
        </InfoCard>
        <InfoCard label="Estado">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              consignee.is_active
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {consignee.is_active ? "Activo" : "Inactivo"}
          </span>
        </InfoCard>
      </div>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Información de contacto">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <DtDd label="Email" value={consignee.email ?? "—"} />
            <DtDd label="Teléfono" value={consignee.phone ?? "—"} />
          </dl>
        </Section>

        <Section title="Dirección">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <DtDd label="Dirección" value={consignee.address_line1 ?? "—"} />
            <DtDd label="Línea 2" value={consignee.address_line2 ?? "—"} />
            <DtDd label="Ciudad" value={consignee.city ?? "—"} />
            <DtDd label="Provincia" value={consignee.province ?? "—"} />
            <DtDd label="Código postal" value={consignee.postal_code ?? "—"} />
          </dl>
        </Section>
      </div>
    </div>
  );
}
