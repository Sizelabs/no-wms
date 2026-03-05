import { PageHeader } from "@/components/layout/page-header";
import { ShippingCategoryForm } from "@/components/tariffs/shipping-category-form";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function NewShippingCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "shipping_categories", "create");

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Categoría de Envío" />
      <ShippingCategoryForm />
    </div>
  );
}
