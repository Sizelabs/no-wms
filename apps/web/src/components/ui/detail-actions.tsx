"use client";

import type { Role } from "@no-wms/shared/constants/roles";
import Link from "next/link";
import { useRef, useState } from "react";

export interface DetailAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "danger";
  roles: Role[];
}

interface DetailActionsProps {
  actions: DetailAction[];
  userRoles: Role[];
}

export function DetailActions({ actions, userRoles }: DetailActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const visible = actions.filter((a) =>
    a.roles.some((r) => userRoles.includes(r)),
  );

  if (visible.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget)) {
            setOpen(false);
          }
        }}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Acciones
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border bg-white py-1 shadow-lg">
          {visible.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  action.variant === "danger"
                    ? "text-red-600"
                    : "text-gray-700"
                }`}
                onClick={() => setOpen(false)}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  action.onClick?.();
                }}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  action.variant === "danger"
                    ? "text-red-600"
                    : "text-gray-700"
                }`}
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
