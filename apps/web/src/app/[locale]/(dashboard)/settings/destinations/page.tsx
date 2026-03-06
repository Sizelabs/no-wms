import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { DestinationList } from "@/components/settings/destination-list";
import { getDestinationsList } from "@/lib/actions/destinations";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function DestinationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "destinations", "read");

  const { data } = await getDestinationsList();

  const canCreate = permissions.destinations.create;
  const canUpdate = permissions.destinations.update;
  const canDelete = permissions.destinations.delete;

  return (
    <div className="space-y-6">
      <PageHeader title="Destinos">
        {canCreate && (
          <Link
            href="destinations/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Destino
          </Link>
        )}
      </PageHeader>
      <DestinationList
        data={data ?? []}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
