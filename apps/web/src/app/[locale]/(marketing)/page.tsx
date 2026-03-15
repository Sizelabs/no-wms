"use client";

import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <style>{`
        @keyframes lp-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="relative flex min-h-screen flex-col bg-[#e8e6e1]">
        {/* ── Grain texture ── */}
        <svg
          aria-hidden
          className="pointer-events-none fixed inset-0 z-10 h-full w-full opacity-[0.25]"
        >
          <filter id="lp-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#lp-grain)" />
        </svg>

        {/* ── Nav ── */}
        <nav className="relative z-20 flex items-center justify-between px-8 pb-7 sm:px-12" style={{ paddingTop: "3rem" }}>
          <span className="text-sm font-medium text-stone-500">no-wms</span>
          <Link
            href="/login"
            className="group flex items-center gap-1 text-sm text-stone-400 transition-colors duration-200 hover:text-stone-600"
          >
            Log in
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </nav>

        {/* ── Hero ── */}
        <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-6 pb-24">
          {/* Pill */}
          <div
            className="rounded-full border border-stone-400/40 px-5 py-1.5"
            style={
              mounted
                ? { animation: "lp-enter .6s ease-out both" }
                : { opacity: 0 }
            }
          >
            <span className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
              Coming Soon
            </span>
          </div>
        </main>

        {/* ── Footer ── */}
        <footer
          className="relative z-20 flex items-center justify-center px-8 py-6"
          style={
            mounted
              ? { animation: "lp-enter .6s ease-out .3s both" }
              : { opacity: 0 }
          }
        >
          <span className="text-[11px] tracking-wide text-stone-400">
            © 2026 no-wms
          </span>
        </footer>
      </div>
    </>
  );
}
