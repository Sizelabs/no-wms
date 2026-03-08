import { redirect } from "next/navigation";

export default async function WrDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { locale, id } = await params;
  const { from } = await searchParams;
  const query = from ? `?from=${from}` : "";
  redirect(`/${locale}/warehouse-receipts/${id}/edit${query}`);
}
