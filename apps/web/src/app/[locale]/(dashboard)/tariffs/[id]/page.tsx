import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { TariffDetail } from "@/components/tariffs/tariff-detail";
import { getTariffSchedule } from "@/lib/actions/tariffs";

export default async function TariffDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const { data: schedule, error } = await getTariffSchedule(id);

  if (error || !schedule) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tarifa — ${schedule.agencies?.name ?? ""}`}
        description={schedule.destinations?.city}
      />
      <TariffDetail schedule={schedule} />
    </div>
  );
}
