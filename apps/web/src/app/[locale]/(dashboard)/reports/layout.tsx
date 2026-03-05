import type { ReactNode } from "react";

import { requirePermission } from "@/lib/auth/require-permission";

export default async function ReportsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePermission(locale, "reports", "read");

  return <>{children}</>;
}
