import { PageHeader } from "@/components/layout/page-header";
import { ChargeTypeForm } from "@/components/tariffs/charge-type-form";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function NewChargeTypePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "charge_types", "create");

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Costo de Manejo" />
      <ChargeTypeForm />
    </div>
  );
}
