import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { DtDd, InfoCard, Section } from "@/components/ui/detail-page";
import { WarehouseDetailActions } from "@/components/warehouses/warehouse-detail-actions";
import { getWarehouse } from "@/lib/actions/warehouses";

export default async function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { data: warehouse, error } = await getWarehouse(id);

  if (error || !warehouse) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Bodega ${warehouse.name}`}>
        <Link
          href={`/${locale}/warehouses`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Volver a bodegas
        </Link>
        <WarehouseDetailActions warehouseId={warehouse.id} />
      </PageHeader>

      {/* Key info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Código">
          <span className="font-mono text-sm">{warehouse.code}</span>
        </InfoCard>
        <InfoCard label="Ciudad">
          {warehouse.city ?? "—"}
        </InfoCard>
        <InfoCard label="País">
          {warehouse.country ?? "—"}
        </InfoCard>
        <InfoCard label="Estado">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              warehouse.is_active
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {warehouse.is_active ? "Activa" : "Inactiva"}
          </span>
        </InfoCard>
      </div>

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <Section title="Información general">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DtDd label="Nombre" value={warehouse.name} />
              <DtDd label="Código" value={warehouse.code} />
              <DtDd label="Ciudad" value={warehouse.city ?? "—"} />
              <DtDd label="País" value={warehouse.country ?? "—"} />
              <DtDd label="Zona horaria" value={warehouse.timezone} />
              <DtDd
                label="Estado"
                value={warehouse.is_active ? "Activa" : "Inactiva"}
              />
            </dl>
          </Section>
        </div>

        {/* Right column: zones & locations */}
        <div className="space-y-6">
          <Section
            title={`Zonas (${warehouse.warehouse_zones?.length ?? 0})`}
          >
            {warehouse.warehouse_zones?.length ? (
              <div className="space-y-3">
                {warehouse.warehouse_zones.map(
                  (zone: {
                    id: string;
                    name: string;
                    code: string;
                    warehouse_locations?: {
                      id: string;
                      label: string;
                      barcode: string;
                    }[];
                  }) => (
                    <div key={zone.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {zone.name}
                        </span>
                        <span className="font-mono text-xs text-gray-500">
                          {zone.code}
                        </span>
                      </div>
                      {zone.warehouse_locations?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {zone.warehouse_locations.map(
                            (loc: {
                              id: string;
                              label: string;
                              barcode: string;
                            }) => (
                              <span
                                key={loc.id}
                                className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                                title={loc.barcode}
                              >
                                {loc.label}
                              </span>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-gray-400">
                          Sin ubicaciones
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin zonas configuradas</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
