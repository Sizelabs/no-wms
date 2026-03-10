import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function LocationQrPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const supabase = await createClient();

  const { data: location } = await supabase
    .from("warehouse_locations")
    .select("id, warehouse_id")
    .eq("barcode", code)
    .maybeSingle();

  if (location) {
    redirect(
      `/${locale}/settings/locations?warehouse=${location.warehouse_id}&location=${location.id}`,
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <p className="mt-4 text-sm text-gray-500">
        Ubicación no encontrada: <code className="font-mono">{code}</code>
      </p>
    </div>
  );
}
