import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">no-wms</h1>
          <p className="mt-1 text-sm text-gray-500">{t("login")}</p>
        </div>

        <LoginForm
          labels={{
            email: t("email"),
            password: t("password"),
            login: t("login"),
            forgotPassword: t("forgotPassword"),
          }}
          forgotPasswordHref={`/${locale}/forgot-password`}
        />
      </div>
    </main>
  );
}
