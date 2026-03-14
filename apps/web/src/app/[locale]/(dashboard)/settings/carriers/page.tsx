import { CarrierList } from "@/components/carriers/carrier-list";
import { PageHeader } from "@/components/layout/page-header";
import { getCarriers } from "@/lib/actions/carriers";
import { getModalities } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function CarriersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "carriers", "read");

  const [{ data: carriers }, { data: modalities }] = await Promise.all([
    getCarriers(),
    getModalities(),
  ]);

  const canCreate = permissions.carriers.create;
  const canUpdate = permissions.carriers.update;

  return (
    <div className="space-y-6">
      <PageHeader title="Transportistas" />
      <CarrierList
        carriers={carriers ?? []}
        modalities={modalities ?? []}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />
    </div>
  );
}
