import { Suspense } from "react";

import { StatCardsSkeleton, WidgetsSkeleton } from "@/components/ui/skeletons";

import { StatsSection } from "./stats-section";
import { WidgetsSection } from "./widgets-section";

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
