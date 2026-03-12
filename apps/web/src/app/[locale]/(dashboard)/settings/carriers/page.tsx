import Link from "next/link";

import { CarrierList } from "@/components/carriers/carrier-list";
import { PageHeader } from "@/components/layout/page-header";
import { getCarriers } from "@/lib/actions/carriers";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function CarriersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "carriers", "read");

  const { data: carriers } = await getCarriers();

  const canCreate = permissions.carriers.create;

  return (
    <div className="space-y-6">
      <PageHeader title="Transportistas">
        {canCreate && (
          <Link
            href={`/${locale}/settings/carriers/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Transportista
          </Link>
        )}
      </PageHeader>
      <CarrierList carriers={carriers ?? []} />
    </div>
  );
}
