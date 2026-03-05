import { PageHeader } from "@/components/layout/page-header";
import { ShippingCategoryForm } from "@/components/tariffs/shipping-category-form";

export default function NewShippingCategoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Categoría de Envío" />
      <ShippingCategoryForm />
    </div>
  );
}
