/**
 * Build a FormData object from a plain object.
 * Handles nested values by JSON-stringifying arrays/objects.
 */
export function buildFormData(obj: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) || typeof value === "object") {
      fd.set(key, JSON.stringify(value));
    } else {
      fd.set(key, String(value));
    }
  }
  return fd;
}
