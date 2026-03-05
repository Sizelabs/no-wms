import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CourierEditForm } from "@/components/couriers/courier-edit-form";
import { PageHeader } from "@/components/layout/page-header";
import { getCourier } from "@/lib/actions/couriers";
import { getAllCountries } from "@/lib/actions/locations";

export default async function CourierEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("couriers");

  const [{ data: courier }, countries] = await Promise.all([
    getCourier(id),
    getAllCountries(),
  ]);
  if (!courier) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("edit")} — ${courier.name}`} />
      <CourierEditForm courier={courier} countries={countries} />
    </div>
  );
}
