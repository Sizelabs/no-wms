import { PageHeader } from "@/components/layout/page-header";
import { HandlingCostForm } from "@/components/tariffs/handling-cost-form";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function NewHandlingCostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "handling_costs", "create");

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Costo de Manejo" />
      <HandlingCostForm />
    </div>
  );
}
