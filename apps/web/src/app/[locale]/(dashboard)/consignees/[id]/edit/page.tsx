import Link from "next/link";
import { notFound } from "next/navigation";

import { ConsigneeEditForm } from "@/components/consignees/consignee-edit-form";
import { PageHeader } from "@/components/layout/page-header";
import { getConsignee } from "@/lib/actions/consignees";
import { getAllCountries } from "@/lib/actions/locations";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function EditConsigneePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requirePermission(locale, "consignees", "update");

  const [{ data: consignee, error }, countries] = await Promise.all([
    getConsignee(id),
    getAllCountries(),
  ]);

  if (error || !consignee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Consignatario">
        <Link
          href={`/${locale}/consignees/${consignee.id}`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Volver al detalle
        </Link>
      </PageHeader>
      <ConsigneeEditForm consignee={consignee} countries={countries} />
    </div>
  );
}
