import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { DestinationForm } from "@/components/settings/destination-form";
import { getDestination } from "@/lib/actions/destinations";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function EditDestinationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "destinations", "update");
  const { data: destination, error } = await getDestination(id);

  if (error || !destination) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar — ${destination.city} (${destination.country_code})`} />
      <DestinationForm destination={destination} />
    </div>
  );
}
