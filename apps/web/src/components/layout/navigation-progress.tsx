"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const SKELETON_SELECTOR = "main [class*='animate-pulse']";

/**
 * Thin progress bar at the top of the viewport that shows immediately
 * when the user clicks a navigation link. Persists until the page's
 * data finishes loading (all Suspense skeletons removed from main),
 * not just until the route changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
      checkTimerRef.current = null;
    }
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    cleanup();
    setIsNavigating(false);
  }, [cleanup]);

  // When pathname changes, wait for skeletons to appear then watch for removal
  useEffect(() => {
    // Only relevant if we're mid-navigation
    if (!isNavigating) return;

    // Give the new page ~100ms to mount its Suspense fallbacks
    checkTimerRef.current = setTimeout(() => {
      const hasSkeletons = () => document.querySelector(SKELETON_SELECTOR) !== null;

      // If no skeletons appeared, the page loaded instantly — finish now
      if (!hasSkeletons()) {
        finish();
        return;
      }

      // Watch for skeleton removal
      observerRef.current = new MutationObserver(() => {
        if (!hasSkeletons()) {
          finish();
        }
      });

      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }, 100);

    return () => {
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor?.href || anchor.target || e.metaKey || e.ctrlKey || e.shiftKey) return;

      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === pathname && url.search === window.location.search) return;

        cleanup();
        setIsNavigating(true);
        // Safety timeout — hide after 15s in case navigation never completes
        timeoutRef.current = setTimeout(() => finish(), 15_000);
      } catch {
        // Invalid URL, ignore
      }
    },
    [pathname, cleanup, finish],
  );

  useEffect(() => {
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [handleClick]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className="h-full bg-gray-900"
        style={{
          animation: "nav-progress 8s ease-out forwards",
        }}
      />
      <style>{`
        @keyframes nav-progress {
          0% { width: 0% }
          5% { width: 15% }
          15% { width: 40% }
          30% { width: 60% }
          50% { width: 75% }
          70% { width: 85% }
          100% { width: 95% }
        }
      `}</style>
    </div>
  );
}
