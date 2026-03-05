"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { forgotPassword } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations("auth");

  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) => {
      return forgotPassword(formData);
    },
    {},
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">no-wms</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("forgotPasswordTitle")}
          </p>
        </div>

        {state.success ? (
          <div className="space-y-4">
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {t("resetLinkSent")}
            </div>
            <Link
              href={`/${locale}/login`}
              className="block text-center text-sm text-gray-500 hover:text-gray-700"
            >
              {t("backToLogin")}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-gray-600">
              {t("forgotPasswordDescription")}
            </p>

            {state.error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <form action={action} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
              >
                {pending ? t("sending") : t("sendResetLink")}
              </button>
            </form>

            <Link
              href={`/${locale}/login`}
              className="block text-center text-sm text-gray-500 hover:text-gray-700"
            >
              {t("backToLogin")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
