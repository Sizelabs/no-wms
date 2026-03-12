import { notFound } from "next/navigation";

import { CarrierForm } from "@/components/carriers/carrier-form";
import { PageHeader } from "@/components/layout/page-header";
import { getCarrier } from "@/lib/actions/carriers";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function EditCarrierPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "carriers", "update");

  const { data: carrier } = await getCarrier(id);
  if (!carrier) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar: ${carrier.name}`} />
      <CarrierForm carrier={carrier} />
    </div>
  );
}
