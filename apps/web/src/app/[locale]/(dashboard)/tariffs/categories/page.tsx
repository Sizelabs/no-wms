import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { ShippingCategoryList } from "@/components/tariffs/shipping-category-list";
import { getShippingCategories } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ShippingCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "shipping_categories", "read");
  const { data } = await getShippingCategories();

  const canCreate = permissions.shipping_categories.create;

  return (
    <div className="space-y-6">
      <PageHeader title="Categorías de Envío">
        {canCreate && (
          <Link
            href="/tariffs/categories/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Categoría
          </Link>
        )}
      </PageHeader>
      <ShippingCategoryList data={data ?? []} />
    </div>
  );
}
