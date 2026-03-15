const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Returns the number of whole days between a date string and today,
 * with both sides normalized to midnight (local time) to avoid
 * partial-day drift.
 */
export function daysSinceDate(dateStr: string): number {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - date.getTime()) / MS_PER_DAY);
}

/**
 * Formats a Date to YYYY-MM-DD in local time, avoiding toISOString()
 * which converts to UTC and can shift dates in non-UTC timezones.
 */
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
