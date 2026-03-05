import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { ModalityList } from "@/components/tariffs/modality-list";
import { getModalities } from "@/lib/actions/tariffs";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ModalitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "tariffs", "read");
  const { data } = await getModalities();

  const canCreate = permissions.tariffs.create;

  return (
    <div className="space-y-6">
      <PageHeader title="Modalidades">
        {canCreate && (
          <Link
            href="modalities/new"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva Modalidad
          </Link>
        )}
      </PageHeader>
      <ModalityList data={data ?? []} />
    </div>
  );
}
