import { PageHeader } from "@/components/layout/page-header";
import { ShippingCategoryList } from "@/components/settings/shipping-category-list";
import { getShippingCategoriesList } from "@/lib/actions/shipping-categories";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ShippingCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "shipping", "read");

  const { data } = await getShippingCategoriesList();

  const canCreate = permissions.shipping.create;
  const canUpdate = permissions.shipping.update;
  const canDelete = permissions.shipping.delete;

  return (
    <div className="space-y-6">
      <PageHeader title="Categorías de Envío" />
      <ShippingCategoryList
        data={data ?? []}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
