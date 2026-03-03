import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CourrierList } from "@/components/courriers/courrier-list";
import { PageHeader } from "@/components/layout/page-header";
import { getCourriers } from "@/lib/actions/courriers";

export default async function CourriersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("courriers");

  const { data: courriers } = await getCourriers();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")}>
        <Link
          href={`/${locale}/courriers/new`}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + {t("new")}
        </Link>
      </PageHeader>
      <CourrierList courriers={courriers ?? []} />
    </div>
  );
}
