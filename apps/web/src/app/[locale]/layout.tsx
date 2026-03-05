import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

import { AuthHashHandler } from "@/components/auth/auth-hash-handler";

export default async function LocaleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthHashHandler />
      {children}
    </NextIntlClientProvider>
  );
}
