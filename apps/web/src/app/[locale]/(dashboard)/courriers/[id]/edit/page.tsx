import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CourrierEditForm } from "@/components/courriers/courrier-edit-form";
import { PageHeader } from "@/components/layout/page-header";
import { getCourrier } from "@/lib/actions/courriers";

export default async function CourrierEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("courriers");

  const { data: courrier } = await getCourrier(id);
  if (!courrier) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("edit")} — ${courrier.name}`} />
      <CourrierEditForm courrier={courrier} />
    </div>
  );
}
