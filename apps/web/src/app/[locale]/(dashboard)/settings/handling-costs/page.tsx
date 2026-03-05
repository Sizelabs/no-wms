import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { HandlingCostList } from "@/components/tariffs/handling-cost-list";
import { getHandlingCosts } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function HandlingCostsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "handling_costs", "read");
  const { data } = await getHandlingCosts();

  const canCreate = permissions.handling_costs.create;

  return (
    <div className="space-y-6">
      <PageHeader title="Handling Costs">
        {canCreate && (
          <Link
            href="handling-costs/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Costo de Manejo
          </Link>
        )}
      </PageHeader>
      <HandlingCostList data={data ?? []} />
    </div>
  );
}
