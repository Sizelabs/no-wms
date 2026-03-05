import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { DtDd, InfoCard, Section } from "@/components/ui/detail-page";
import { WarehouseDetailActions } from "@/components/warehouses/warehouse-detail-actions";
import { getWarehouseReceipts } from "@/lib/actions/warehouse-receipts";
import { getWarehouse } from "@/lib/actions/warehouses";
import { requirePermission } from "@/lib/auth/require-permission";

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-50 text-blue-700",
  in_warehouse: "bg-green-50 text-green-700",
  in_work_order: "bg-yellow-50 text-yellow-700",
  in_dispatch: "bg-purple-50 text-purple-700",
  dispatched: "bg-gray-100 text-gray-600",
  damaged: "bg-red-50 text-red-700",
  abandoned: "bg-gray-200 text-gray-500",
};

export default async function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "warehouses", "read");
  const [warehouseResult, wrsResult] = await Promise.all([
    getWarehouse(id),
    getWarehouseReceipts({ warehouse_id: id, limit: 20 }),
  ]);

  const { data: warehouse, error } = warehouseResult;
  if (error || !warehouse) {
    notFound();
  }

  const recentWrs = wrsResult.data ?? [];
  const totalWrs = wrsResult.count;

  return (
    <div className="space-y-6">
      <PageHeader title={`Bodega ${warehouse.name}`}>
        <Link
          href={`/${locale}/settings/warehouses`}
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

      {/* Warehouse Receipts */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Warehouse Receipts ({totalWrs})
          </h3>
          <Link
            href={`/${locale}/inventory?warehouse_id=${warehouse.id}`}
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Ver todo el inventario
          </Link>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">WR#</th>
              <th className="px-4 py-3">Guía</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Peso</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Recibido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recentWrs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Sin recibos en esta bodega.
                </td>
              </tr>
            ) : (
              recentWrs.map(
                (wr: {
                  id: string;
                  wr_number: string;
                  status: string;
                  total_billable_weight_lb: number | null;
                  has_damaged_package: boolean;
                  received_at: string;
                  agencies: { name: string; code: string } | null;
                  packages: { tracking_number: string }[];
                }) => (
                  <tr key={wr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/${locale}/inventory/${wr.id}`}
                        className="font-mono text-xs font-medium text-gray-900 hover:underline"
                      >
                        {wr.wr_number}
                      </Link>
                      {wr.has_damaged_package && (
                        <span className="ml-1 inline-flex rounded bg-red-100 px-1 text-[10px] text-red-700">
                          Daño
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                      {wr.packages?.[0]?.tracking_number ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {wr.agencies?.code ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {wr.total_billable_weight_lb ? Number(wr.total_billable_weight_lb).toFixed(1) : "—"} lb
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[wr.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {WR_STATUS_LABELS[wr.status as WrStatus] ?? wr.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {new Date(wr.received_at).toLocaleDateString("es")}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
