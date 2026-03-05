import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ShippingCategoryForm } from "@/components/tariffs/shipping-category-form";
import { getShippingCategory } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function EditShippingCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "shipping_categories", "update");
  const { data: category, error } = await getShippingCategory(id);

  if (error || !category) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Categoría — ${category.name}`} />
      <ShippingCategoryForm category={category} />
    </div>
  );
}
