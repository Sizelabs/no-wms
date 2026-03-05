import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CourierDetail } from "@/components/couriers/courier-detail";
import { PageHeader } from "@/components/layout/page-header";
import { getCourier } from "@/lib/actions/couriers";
import { getTariffSchedules } from "@/lib/actions/tariffs";
import { getCourierUsers } from "@/lib/actions/users";
import { getUserCourierScope } from "@/lib/auth/scope";

export default async function CourierDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("couriers");

  const [{ data: courier }, { data: users }, { data: tariffs }] = await Promise.all([
    getCourier(id),
    getCourierUsers(id),
    getTariffSchedules({ courier_id: id }),
  ]);
  if (!courier) notFound();

  const courierIds = await getUserCourierScope();
  const isScopedToSingle = courierIds !== null && courierIds.length <= 1;

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("detail")} — ${courier.name}`}>
        {!isScopedToSingle && (
          <Link
            href={`/${locale}/couriers`}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Volver a couriers
          </Link>
        )}
      </PageHeader>
      <CourierDetail courier={courier} users={users ?? []} tariffs={tariffs ?? []} />
    </div>
  );
}
