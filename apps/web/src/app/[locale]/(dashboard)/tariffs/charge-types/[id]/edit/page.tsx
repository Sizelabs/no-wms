import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ChargeTypeForm } from "@/components/tariffs/charge-type-form";
import { getChargeType } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function EditChargeTypePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "charge_types", "update");
  const { data: chargeType, error } = await getChargeType(id);

  if (error || !chargeType) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar — ${chargeType.name}`} />
      <ChargeTypeForm chargeType={chargeType} />
    </div>
  );
}
