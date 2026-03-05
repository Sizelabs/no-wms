import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { UnknownWrList } from "@/components/warehouse/unknown-wr-list";
import { getUnknownWrs } from "@/lib/actions/unknown-wrs";
import { requirePermission } from "@/lib/auth/require-permission";
import { getPrimaryRole } from "@/lib/navigation";

export default async function UnknownWrsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { roles } = await requirePermission(locale, "unknown_wrs", "read");
  const t = await getTranslations("nav");

  const primaryRole = getPrimaryRole(roles);
  const isAgencyRole = primaryRole === "agency";

  const { data } = await getUnknownWrs({
    status: "unclaimed",
    maskTracking: isAgencyRole,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("unknownWrs")} />
      <UnknownWrList data={data ?? []} isAgencyRole={isAgencyRole} trackingMasked={isAgencyRole} />
    </div>
  );
}
