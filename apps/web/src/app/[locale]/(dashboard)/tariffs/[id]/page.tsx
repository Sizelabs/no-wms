import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { TariffDetail } from "@/components/tariffs/tariff-detail";
import { getTariffSchedule } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function TariffDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "tariffs", "read");
  const { data: schedule, error } = await getTariffSchedule(id);

  if (error || !schedule) {
    notFound();
  }

  const label = schedule.handling_costs?.name ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tarifa — ${label}`}
        description={schedule.destinations?.city ?? "Todos los destinos"}
      />
      <TariffDetail schedule={schedule} />
    </div>
  );
}
