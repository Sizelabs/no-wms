import { Suspense } from "react";

import { DashboardStatCards, DashboardWidgets } from "@/components/layout/dashboard-grid";
import { StatCardsSkeleton, WidgetsSkeleton } from "@/components/ui/skeletons";
import { getDashboardStatCounts, getDashboardWidgetData } from "@/lib/actions/reports";
import { getAuthContext } from "@/lib/auth/context";

async function StatsSection() {
  const counts = await getDashboardStatCounts();
  return <DashboardStatCards counts={counts} />;
}

async function WidgetsSection() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const widgets = await getDashboardWidgetData();
  return <DashboardWidgets role={ctx.primaryRole} widgets={widgets as never} />;
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Dashboard
      </h1>
      <Suspense fallback={<StatCardsSkeleton />}>
        <StatsSection />
      </Suspense>
      <Suspense fallback={<WidgetsSkeleton />}>
        <WidgetsSection />
      </Suspense>
    </div>
  );
}
