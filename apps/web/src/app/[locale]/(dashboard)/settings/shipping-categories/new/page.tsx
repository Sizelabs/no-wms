import { PageHeader } from "@/components/layout/page-header";
import { ShippingCategoryForm } from "@/components/settings/shipping-category-form";
import { getModalities } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function NewShippingCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "shipping", "create");

  const { data: modalities } = await getModalities();

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Categoría de Envío" />
      <ShippingCategoryForm modalities={(modalities ?? []).map((m: { id: string; name: string; code: string }) => ({ id: m.id, name: m.name, code: m.code }))} />
    </div>
  );
}
