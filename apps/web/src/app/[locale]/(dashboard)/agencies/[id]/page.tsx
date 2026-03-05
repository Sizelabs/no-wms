import type { AgencyType } from "@no-wms/shared/constants/agency-types";
import { AGENCY_TYPE_LABELS } from "@no-wms/shared/constants/agency-types";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AgencyDetail } from "@/components/agencies/agency-detail";
import { AgencyDetailActions } from "@/components/agencies/agency-detail-actions";
import { PageHeader } from "@/components/layout/page-header";
import { DtDd, InfoCard, Section } from "@/components/ui/detail-page";
import { getAgency } from "@/lib/actions/agencies";
import { getConsigneesByAgency } from "@/lib/actions/consignees";
import { getTariffSchedules } from "@/lib/actions/tariffs";
import { getAgencyUsers } from "@/lib/actions/users";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "agencies", "read");

  const [agencyResult, consigneesResult, usersResult, overridesResult, baseResult] = await Promise.all([
    getAgency(id),
    getConsigneesByAgency(id),
    getAgencyUsers(id),
    getTariffSchedules({ agency_id: id }),
    getTariffSchedules({ is_active: true }),
  ]);

  // Combine agency overrides + base rates (where agency_id is null)
  const overrides = overridesResult.data ?? [];
  const baseTariffs = (baseResult.data ?? []).filter((t) => t.agency_id === null);
  const allTariffs = [...overrides, ...baseTariffs];

  const agency = agencyResult.data;
  if (agencyResult.error || !agency) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Agencia ${agency.name}`}>
        <Link
          href={`/${locale}/agencies`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Volver a agencias
        </Link>
        <AgencyDetailActions agencyId={agency.id} />
      </PageHeader>

      {/* Key info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <InfoCard label="Identificador">
          <span className="font-mono text-sm">{agency.code}</span>
        </InfoCard>
        <InfoCard label="Tipo">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              agency.type === "corporativo"
                ? "bg-blue-50 text-blue-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {AGENCY_TYPE_LABELS[agency.type as AgencyType]}
          </span>
        </InfoCard>
        <InfoCard label="Courier">
          {agency.couriers ? `${agency.couriers.name} (${agency.couriers.code})` : "—"}
        </InfoCard>
        <InfoCard label="Destino principal">
          {(() => {
            const home = agency.agency_destinations?.find(
              (d: { is_home: boolean; destinations: { city: string; country_code: string } | null }) => d.is_home,
            );
            return home?.destinations
              ? `${home.destinations.city}, ${home.destinations.country_code}`
              : "—";
          })()}
        </InfoCard>
        <InfoCard label="Estado">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              agency.is_active
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {agency.is_active ? "Activa" : "Inactiva"}
          </span>
        </InfoCard>
      </div>

      <AgencyDetail agencyId={agency.id} consignees={consigneesResult.data ?? []} users={usersResult.data ?? []} tariffs={allTariffs}>
        {/* Details grid — original info tab content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            <Section title="Información de contacto">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <DtDd label="RUC" value={agency.ruc ?? "—"} />
                <DtDd label="Teléfono" value={agency.phone ?? "—"} />
                <DtDd label="Email" value={agency.email ?? "—"} />
                <DtDd label="Dirección" value={agency.address ?? "—"} />
              </dl>
            </Section>
            <Section title="Configuración">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <DtDd
                  label="Múltiples paquetes por recibo"
                  value={agency.allow_multi_package ? "Sí" : "No"}
                />
              </dl>
            </Section>
          </div>

          {/* Right column: contacts */}
          <div className="space-y-6">
            <Section
              title={`Contactos (${agency.agency_contacts?.length ?? 0})`}
            >
              {agency.agency_contacts?.length ? (
                <div className="space-y-2">
                  {agency.agency_contacts.map(
                    (contact: {
                      id: string;
                      name: string;
                      phone: string | null;
                      email: string | null;
                      role: string | null;
                    }) => (
                      <div
                        key={contact.id}
                        className="rounded-md border p-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {contact.name}
                          </span>
                          {contact.role && (
                            <span className="text-xs text-gray-500">
                              {contact.role}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex gap-3 text-xs text-gray-500">
                          {contact.phone && <span>{contact.phone}</span>}
                          {contact.email && <span>{contact.email}</span>}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin contactos registrados</p>
              )}
            </Section>
          </div>
        </div>
      </AgencyDetail>
    </div>
  );
}
