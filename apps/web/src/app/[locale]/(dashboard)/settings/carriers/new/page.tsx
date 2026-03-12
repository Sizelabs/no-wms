import { CarrierForm } from "@/components/carriers/carrier-form";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function NewCarrierPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "carriers", "create");

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Transportista" />
      <CarrierForm />
    </div>
  );
}
