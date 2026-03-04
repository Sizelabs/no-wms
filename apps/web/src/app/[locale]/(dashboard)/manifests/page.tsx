import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { MawbList } from "@/components/manifests/mawb-list";
import { getMawbs } from "@/lib/actions/manifests";

export default async function ManifestsPage() {
  const t = await getTranslations("nav");

  const mawbsResult = await getMawbs();

  return (
    <div className="space-y-6">
      <PageHeader title={t("manifests")}>
        <Link
          href="manifests/new-mawb"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + MAWB
        </Link>
      </PageHeader>
      <MawbList data={mawbsResult.data ?? []} />
    </div>
  );
}
