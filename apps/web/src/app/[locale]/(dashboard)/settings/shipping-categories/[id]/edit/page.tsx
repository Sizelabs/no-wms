import { PageHeader } from "@/components/layout/page-header";
import { ShippingCategoryForm } from "@/components/settings/shipping-category-form";
import { getShippingCategory } from "@/lib/actions/shipping-categories";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function EditShippingCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "shipping", "update");

  const { data } = await getShippingCategory(id);

  if (!data) {
    return <p className="p-8 text-center text-gray-400">Categoría no encontrada</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar Categoría ${data.code}`} />
      <ShippingCategoryForm item={data} />
    </div>
  );
}
