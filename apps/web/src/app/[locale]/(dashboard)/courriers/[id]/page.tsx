import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CourrierDetail } from "@/components/courriers/courrier-detail";
import { PageHeader } from "@/components/layout/page-header";
import { getCourrier } from "@/lib/actions/courriers";

export default async function CourrierDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("courriers");

  const { data: courrier } = await getCourrier(id);
  if (!courrier) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("detail")} — ${courrier.name}`}>
        <Link
          href={`/${locale}/courriers`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Volver a courriers
        </Link>
      </PageHeader>
      <CourrierDetail courrier={courrier} />
    </div>
  );
}
