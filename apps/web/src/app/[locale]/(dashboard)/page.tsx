import { Suspense } from "react";

import { DashboardGrid } from "@/components/layout/dashboard-grid";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { getDashboardStats } from "@/lib/actions/reports";
import { getAuthContext } from "@/lib/auth/context";

async function DashboardContent() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const stats = await getDashboardStats();
  return <DashboardGrid role={ctx.primaryRole} stats={stats as never} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
