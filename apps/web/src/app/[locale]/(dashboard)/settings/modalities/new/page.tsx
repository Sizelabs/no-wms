import { PageHeader } from "@/components/layout/page-header";
import { ModalityForm } from "@/components/tariffs/modality-form";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function NewModalityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "modalities", "create");

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Modalidad" />
      <ModalityForm />
    </div>
  );
}
