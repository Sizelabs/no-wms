import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ShippingCategoryForm } from "@/components/tariffs/shipping-category-form";
import { getShippingCategory } from "@/lib/actions/tariffs";

export default async function EditShippingCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: category, error } = await getShippingCategory(id);

  if (error || !category) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Categoría — ${category.name}`} />
      <ShippingCategoryForm category={category} />
    </div>
  );
}
