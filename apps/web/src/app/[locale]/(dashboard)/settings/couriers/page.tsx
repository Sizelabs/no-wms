import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CourierList } from "@/components/couriers/courier-list";
import { PageHeader } from "@/components/layout/page-header";
import { getCouriers } from "@/lib/actions/couriers";
import { requirePermission } from "@/lib/auth/require-permission";
import { getUserCourierScope } from "@/lib/auth/scope";

export default async function CouriersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "couriers", "read");
  const t = await getTranslations("couriers");

  // Destination roles scoped to a single courier → go straight to detail
  const courierIds = await getUserCourierScope();
  if (courierIds && courierIds.length === 1) {
    redirect(`/${locale}/settings/couriers/${courierIds[0]}`);
  }

  const { data: couriers } = await getCouriers();

  const canCreate = permissions.couriers.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")}>
        {canCreate && (
          <Link
            href={`/${locale}/settings/couriers/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + {t("new")}
          </Link>
        )}
      </PageHeader>
      <CourierList couriers={couriers ?? []} />
    </div>
  );
}
