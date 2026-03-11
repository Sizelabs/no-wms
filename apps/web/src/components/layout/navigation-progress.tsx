"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Thin progress bar at the top of the viewport that shows immediately
 * when the user clicks a navigation link. Provides instant feedback
 * while Next.js fetches the new page's RSC payload from the server.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigation completes when pathname changes
  useEffect(() => {
    setIsNavigating(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [pathname]);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor?.href || anchor.target || e.metaKey || e.ctrlKey || e.shiftKey) return;

      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === pathname && url.search === window.location.search) return;

        setIsNavigating(true);
        // Safety timeout — hide after 10s in case navigation never completes
        timeoutRef.current = setTimeout(() => setIsNavigating(false), 10_000);
      } catch {
        // Invalid URL, ignore
      }
    },
    [pathname],
  );

  useEffect(() => {
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [handleClick]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className="h-full bg-gray-900"
        style={{
          animation: "nav-progress 2s ease-out forwards",
        }}
      />
      <style>{`
        @keyframes nav-progress {
          0% { width: 0% }
          20% { width: 30% }
          50% { width: 60% }
          80% { width: 85% }
          100% { width: 95% }
        }
      `}</style>
    </div>
  );
}
