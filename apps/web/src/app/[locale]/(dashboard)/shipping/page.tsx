import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { SiList } from "@/components/shipping/si-list";
import { getShippingInstructions } from "@/lib/actions/shipping-instructions";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ShippingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "shipping", "read");
  const t = await getTranslations("nav");
  const { data } = await getShippingInstructions();

  const canCreate = permissions.shipping.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("shipping")}>
        {canCreate && (
          <Link
            href="shipping/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Embarque
          </Link>
        )}
      </PageHeader>
      <SiList data={data ?? []} />
    </div>
  );
}
