import type { ReactNode } from "react";

// Root layout — redirects are handled by middleware.
// The [locale] segment handles actual rendering.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
