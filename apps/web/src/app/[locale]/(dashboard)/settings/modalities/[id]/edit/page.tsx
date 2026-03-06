import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ModalityForm } from "@/components/tariffs/modality-form";
import { getModality } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function EditModalityPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "modalities", "update");
  const { data: modality, error } = await getModality(id);

  if (error || !modality) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Editar — ${modality.name}`} />
      <ModalityForm modality={modality} />
    </div>
  );
}
