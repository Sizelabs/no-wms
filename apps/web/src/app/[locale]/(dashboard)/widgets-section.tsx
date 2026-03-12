import { DashboardWidgets } from "@/components/layout/dashboard-grid";
import { getDashboardWidgetData } from "@/lib/actions/reports";
import { getAuthContext } from "@/lib/auth/context";

export async function WidgetsSection() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const widgets = await getDashboardWidgetData();
  return <DashboardWidgets role={ctx.primaryRole} widgets={widgets as never} />;
}
