import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { CreateShipmentButton } from "@/components/shipping/create-shipment-button";
import { SiList } from "@/components/shipping/si-list";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { getShippingInstructions } from "@/lib/actions/shipping-instructions";
import { requirePermission } from "@/lib/auth/require-permission";

async function ShippingHeader({ locale }: { locale: string }) {
  const { permissions } = await requirePermission(locale, "shipping", "read");
  const t = await getTranslations("nav");
  const canCreate = permissions.shipping.create;

  return (
    <PageHeader title={t("shipping")}>
      {canCreate && <CreateShipmentButton />}
    </PageHeader>
  );
}

async function ShippingTableSection({ locale }: { locale: string }) {
  await requirePermission(locale, "shipping", "read");
  const { data } = await getShippingInstructions();
  return <SiList data={data ?? []} locale={locale} />;
}

export default async function ShippingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="space-y-6">
      <Suspense fallback={<PageHeaderSkeleton hasButtons />}>
        <ShippingHeader locale={locale} />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <ShippingTableSection locale={locale} />
      </Suspense>
    </div>
  );
}
