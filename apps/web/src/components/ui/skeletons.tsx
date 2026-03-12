function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <Pulse className="mb-2 h-4 w-24" />
      <Pulse className="h-8 w-16" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton({ hasButtons = false }: { hasButtons?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Pulse className="h-7 w-48" />
      </div>
      {hasButtons && (
        <div className="flex items-center gap-2">
          <Pulse className="h-8 w-28 rounded-md" />
        </div>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      {/* Header */}
      <div className="flex gap-4 border-b bg-gray-50 px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Pulse key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 border-b px-4 py-3 last:border-b-0">
          {Array.from({ length: cols }, (_, j) => (
            <Pulse key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function WidgetsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="rounded-lg border bg-white p-5 shadow-sm">
          <Pulse className="mb-3 h-4 w-32" />
          <Pulse className="mb-2 h-10 w-16" />
          <Pulse className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Pulse className="h-8 w-64" />
      <StatCardsSkeleton />
      <WidgetsSkeleton />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton hasButtons />
      <TableSkeleton />
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-lg border bg-white p-6 shadow-sm">
            <Pulse className="mb-3 h-5 w-40" />
            <Pulse className="mb-2 h-4 w-full" />
            <Pulse className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <Pulse className="mx-auto h-8 w-32" />
        <div className="space-y-4">
          <Pulse className="h-10 w-full rounded-md" />
          <Pulse className="h-10 w-full rounded-md" />
          <Pulse className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
