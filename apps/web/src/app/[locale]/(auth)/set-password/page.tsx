import { redirect } from "next/navigation";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function SetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If there's no session the invite token wasn't exchanged — send to login
  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">no-wms</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bienvenido, {user.user_metadata?.full_name ?? user.email}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Configura tu contraseña para acceder a la plataforma.
          </p>
        </div>
        <SetPasswordForm locale={locale} />
      </div>
    </main>
  );
}
