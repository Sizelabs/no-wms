import { DashboardStatCards } from "@/components/layout/dashboard-grid";
import { getDashboardStatCounts } from "@/lib/actions/reports";

export async function StatsSection() {
  const counts = await getDashboardStatCounts();
  return <DashboardStatCards counts={counts} />;
}
