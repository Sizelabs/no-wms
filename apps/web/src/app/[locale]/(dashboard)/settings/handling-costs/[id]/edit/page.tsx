import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { HandlingCostForm } from "@/components/tariffs/handling-cost-form";
import { getHandlingCost } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function EditHandlingCostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "handling_costs", "update");
  const { data: handlingCost, error } = await getHandlingCost(id);

  if (error || !handlingCost) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar — ${handlingCost.name}`} />
      <HandlingCostForm handlingCost={handlingCost} />
    </div>
  );
}
