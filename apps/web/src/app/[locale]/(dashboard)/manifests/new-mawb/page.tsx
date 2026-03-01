import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { MawbCreateForm } from "@/components/manifests/mawb-create-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewMawbPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [warehousesResult, destinationsResult] = await Promise.all([
    supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
    supabase.from("destination_countries").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo MAWB" />
      <MawbCreateForm
        warehouses={warehousesResult.data ?? []}
        destinations={destinationsResult.data ?? []}
      />
    </div>
  );
}
