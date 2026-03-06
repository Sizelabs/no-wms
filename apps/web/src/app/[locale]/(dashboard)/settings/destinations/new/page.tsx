import { PageHeader } from "@/components/layout/page-header";
import { DestinationForm } from "@/components/settings/destination-form";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function NewDestinationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "destinations", "create");

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Destino" />
      <DestinationForm />
    </div>
  );
}
