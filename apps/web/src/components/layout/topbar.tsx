"use client";

import { useTranslations } from "next-intl";

import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface TopbarProps {
  userName: string;
  userRole: string;
  userEmail: string;
  orgName: string;
  locale: string;
}

export function Topbar({ userName, userRole, userEmail, orgName, locale }: TopbarProps) {
  const t = useTranslations("common");

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4">
      {/* Search placeholder (⌘K) */}
      <div className="flex flex-1 items-center">
        <button
          type="button"
          className="flex h-9 w-full max-w-sm items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 hover:bg-gray-100"
        >
          <span className="flex-1 text-left">{t("search")}...</span>
          <kbd className="hidden rounded border bg-white px-1.5 py-0.5 text-xs text-gray-400 sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight text-gray-900">{userName}</p>
            <p className="text-xs leading-tight text-gray-500">
              {orgName ? (
                <>{orgName} <span className="text-gray-300">|</span> {userRole}</>
              ) : (
                userRole
              )}
            </p>
          </div>
          <UserMenu
            userName={userName}
            userRole={userRole}
            userEmail={userEmail}
            locale={locale}
          />
        </div>
      </div>
    </header>
  );
}
